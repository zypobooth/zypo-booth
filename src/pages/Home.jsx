import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, LogIn, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';

import { Helmet } from 'react-helmet-async';

import { usePhotoBoothContext } from '../context/PhotoBoothContext';


const Home = () => {
    const navigate = useNavigate();
    const { user, signInWithGoogle, signOut } = useAuth();
    const { setTheme } = useTheme();
    const { resetSession } = usePhotoBoothContext();
    const [isPaying, setIsPaying] = React.useState(false);
    const [qrData, setQrData] = React.useState(null);
    const [showSuccess, setShowSuccess] = React.useState(false);
    const pollingInterval = React.useRef(null);
    const pollingDelay = React.useRef(3000);

    const checkPaymentStatus = async (orderId) => {
        try {
            const response = await fetch('/api/midtrans-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await response.json();

            if (data.transaction_status === 'settlement' || data.transaction_status === 'capture') {
                if (pollingInterval.current) clearTimeout(pollingInterval.current);
                setQrData(null);
                setIsPaying(false);
                setShowSuccess(true);

                // Auto navigate after 3.5 seconds
                setTimeout(() => {
                    navigate('/select-frame');
                }, 3500);
            } else {
                // Exponential backoff for polling (max 10s)
                pollingDelay.current = Math.min(pollingDelay.current * 1.5, 10000);
                pollingInterval.current = setTimeout(() => {
                    checkPaymentStatus(orderId);
                }, pollingDelay.current);
            }
        } catch (error) {
            console.error("Status check failed:", error);
            pollingDelay.current = Math.min(pollingDelay.current * 1.5, 10000);
            pollingInterval.current = setTimeout(() => {
                checkPaymentStatus(orderId);
            }, pollingDelay.current);
        }
    };

    const handleStartGame = async () => {
        setIsPaying(true);
        resetSession();

        try {
            const response = await fetch('/api/midtrans-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest',
                    customerEmail: user?.email || 'guest@zypobooth.com'
                })
            });

            if (!response.ok) throw new Error('Failed to generate payment QR');

            const data = await response.json();

            if (data.qr_url) {
                setQrData({
                    url: data.qr_url,
                    orderId: data.order_id,
                    price: Math.round(data.gross_amount || 30000)
                });

                // Start polling with exponential backoff
                if (pollingInterval.current) clearTimeout(pollingInterval.current);
                pollingDelay.current = 3000;
                pollingInterval.current = setTimeout(() => {
                    checkPaymentStatus(data.order_id);
                }, pollingDelay.current);

            } else {
                setIsPaying(false);
                navigate('/select-frame');
            }
        } catch (error) {
            console.error("Payment error:", error);
            setIsPaying(false);
            setQrData(null);
            navigate('/select-frame'); // Fallback
        }
    };

    useEffect(() => {
        return () => {
            if (pollingInterval.current) clearTimeout(pollingInterval.current);
        };
    }, []);

    const getDisplayName = React.useMemo(() => {
        if (!user) return '';

        const fullName = user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Player';

        return fullName.split(' ')[0];
    }, [user]);

    return (
        <div className="h-dvh font-nunito flex flex-col relative overflow-hidden">
            <Helmet>
                <title>ZYPO Booth - Free Online Photobooth</title>
                <meta name="description" content="Click, Snap, Shine! ZYPO Booth is the best free online photobooth with custom frames, filters, and instant downloads. No app installation needed." />
                <meta name="keywords" content="online photobooth, web photobooth, camera filters, custom frames, photo booth app, free photobooth, pixenze" />
                <link rel="canonical" href="https://zypobooth.com/" />

                {/* Open Graph */}
                <meta property="og:title" content="ZYPO Booth - Free Online Photobooth" />
                <meta property="og:description" content="Capture your best moments with ZYPO Booth's fun frames and filters!" />
                <meta property="og:url" content="https://zypobooth.com/" />
                <meta property="og:type" content="website" />
            </Helmet>

            {qrData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#2D1B69] border-4 border-game-secondary p-1 rounded-[2.5rem] max-w-md w-full shadow-game-lg relative overflow-hidden"
                    >
                        <div className="p-6 text-center">
                            <h2 className="text-3xl font-titan text-game-secondary text-stroke-sm mb-1 uppercase">PAYMENT REQUIRED</h2>
                            <p className="text-white font-mono text-xs mb-4 tracking-widest animate-pulse">SCAN QRIS TO START SESSION</p>

                            <div className="bg-white p-4 rounded-3xl border-4 border-black shadow-inner mb-6 min-h-[300px] flex flex-col items-center justify-center relative">
                                {/* Price Tag Badge */}
                                <div className="absolute -top-4 bg-game-primary border-4 border-black px-4 py-1 rounded-full shadow-game z-10 transform -rotate-2">
                                    <span className="text-white font-titan text-lg">
                                        Rp {new Intl.NumberFormat('id-ID').format(qrData.price)}
                                    </span>
                                </div>

                                <img
                                    src={qrData.url}
                                    alt="QRIS Code"
                                    className="w-full max-w-[240px] h-auto rounded-xl shadow-md mt-2"
                                />
                                <div className="mt-4 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-game-secondary rounded-full animate-bounce"></div>
                                    <span className="text-black font-bold text-[10px] uppercase tracking-tighter">Waiting for payment...</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setQrData(null);
                                    setIsPaying(false);
                                    if (pollingInterval.current) clearInterval(pollingInterval.current);
                                }}
                                className="w-full py-4 px-6 bg-red-600 hover:bg-red-500 text-white font-titan border-4 border-black rounded-2xl shadow-game transition-all active:translate-y-1 active:shadow-none"
                            >
                                CANCEL PAYMENT
                            </button>
                        </div>

                        <div className="h-4 bg-game-secondary border-t-4 border-black"></div>
                    </motion.div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-game-success border-4 border-black p-1 rounded-[3rem] max-w-sm w-full shadow-[0_0_50px_rgba(34,197,94,0.5)] relative overflow-hidden"
                    >
                        <div className="p-8 text-center bg-[#1a1a1a] rounded-[2.8rem] m-0.5 border-2 border-white/10">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="flex justify-center mb-6"
                            >
                                <div className="bg-game-success p-5 rounded-full border-4 border-black shadow-game">
                                    <CheckCircle size={48} className="text-black" />
                                </div>
                            </motion.div>

                            <h2 className="text-4xl font-titan text-game-success text-stroke-sm mb-2 uppercase leading-none">
                                SUCCESS!
                            </h2>
                            <p className="text-white font-mono text-sm mb-8 tracking-widest">
                                PAYMENT CONFIRMED<br />
                                <span className="text-white/50 text-[10px]">PREPARING YOUR BOOTH...</span>
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/select-frame')}
                                className="w-full py-4 px-6 bg-white text-black font-titan border-4 border-black rounded-2xl shadow-game transition-all"
                            >
                                CONTINUE
                            </motion.button>
                        </div>

                        {/* Animated background stripes */}
                        <div className="absolute inset-0 pointer-events-none opacity-10">
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_20px,white_20px,white_40px)] animate-pulse"></div>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>



            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, -30, 0]
                }}
                transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                className="hidden md:block absolute top-1/4 left-1/4 w-[400px] h-[400px] blob-optimized rounded-full pointer-events-none"
                style={{ backgroundColor: 'var(--blob-color-1)' }}
            ></motion.div>

            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    x: [0, -40, 0],
                    y: [0, 40, 0]
                }}
                transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
                className="hidden md:block absolute bottom-1/4 right-1/4 w-[500px] h-[500px] blob-optimized rounded-full pointer-events-none"
                style={{ backgroundColor: 'var(--blob-color-2)' }}
            ></motion.div>

            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    rotate: [0, 180, 360]
                }}
                transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                className="hidden md:block absolute top-1/2 right-1/3 w-[300px] h-[300px] blob-optimized rounded-full pointer-events-none"
                style={{ backgroundColor: 'var(--blob-color-3)' }}
            ></motion.div>


            <div className="flex-1 flex flex-col items-center justify-center w-full p-3 md:p-6 z-10 min-h-0">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center flex flex-col items-center w-full max-w-4xl min-h-0"
                >
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="relative mb-3 md:mb-8"
                    >
                        <motion.h1
                            animate={{ rotate: [-2, -3, -1, -2] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="text-6xl sm:text-[8rem] md:text-[11rem] font-titan text-game-accent text-stroke drop-shadow-game-lg leading-none"
                        >
                            ZYPO
                        </motion.h1>
                        <motion.h1
                            animate={{ rotate: [2, 3, 1, 2] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="text-5xl sm:text-[6rem] md:text-[9rem] font-titan text-game-secondary text-stroke drop-shadow-game-lg -mt-4 md:-mt-8 leading-none"
                        >
                            BOOTH
                        </motion.h1>
                    </motion.div>


                    {!user ? (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="flex flex-col gap-3 md:gap-5 items-center w-full max-w-sm px-4"
                        >

                            <motion.button
                                whileHover={{ scale: 1.05, rotate: [0, 1, -1, 0] }}
                                whileTap={{ scale: 0.95 }}
                                onClick={signInWithGoogle}
                                className="w-full btn-game-primary btn-cute text-base sm:text-xl flex items-center justify-center gap-2 py-2.5 sm:py-4 px-6 shadow-game rounded-2xl font-titan relative overflow-hidden group"
                            >
                                <LogIn size={24} />
                                LOGIN GOOGLE
                            </motion.button>

                            <p className="text-[#00F0FF] font-mono text-xs mt-2 md:animate-pulse">
                                INSERT COIN TO START
                            </p>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 md:gap-6 w-full max-w-2xl px-4 min-h-0">

                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                whileHover={{ scale: 1.05 }}
                                className="bg-white border-2 border-black px-4 md:px-6 py-1.5 md:py-2 rounded-full shadow-[4px_4px_0_#000] flex items-center gap-3 transform -rotate-1"
                            >
                                <div className="w-3 h-3 rounded-full bg-green-500 border border-black"></div>
                                <span className="text-black font-bold font-titan tracking-wider text-sm md:text-base">
                                    HI, {getDisplayName.toUpperCase()}!
                                </span>
                            </motion.div>

                            <div className="flex justify-center w-full max-w-xl group/btn-wrap relative">
                                {/* Extra ambient glow */}
                                <div className="absolute inset-0 bg-game-success/20 blur-3xl rounded-full scale-150 opacity-0 group-hover/btn-wrap:opacity-100 transition-opacity duration-700"></div>

                                <motion.button
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    whileHover={{
                                        scale: 1.08,
                                        rotate: [0, -1, 1, 0],
                                        y: -12
                                    }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={handleStartGame}
                                    className="group bg-game-success btn-cute text-black border-4 border-black shadow-[8px_8px_0_#000] rounded-[3rem] p-6 md:p-10 flex flex-col items-center justify-center gap-2 md:gap-4 transition-all relative overflow-hidden w-full h-full max-w-sm"
                                >
                                    {/* Animated Glossy Shine */}
                                    <motion.div
                                        animate={{ x: [-500, 500] }}
                                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                        className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 pointer-events-none"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none"></div>

                                    <div className="flex flex-col items-center relative z-10">
                                        <span className="text-2xl md:text-5xl font-titan text-stroke-sm text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] leading-tight">
                                            {isPaying ? 'LOADING...' : 'START'}
                                        </span>
                                    </div>
                                </motion.button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={signOut}
                                className="text-red-400 font-bold hover:text-white hover:underline mt-2 md:mt-6 text-[10px] md:text-sm font-mono tracking-widest uppercase bg-black/50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 hover:border-red-500 transition-colors"
                            >
                                Quit Game (Logout)
                            </motion.button>
                        </div>
                    )}
                </motion.div>
            </div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full py-2 md:py-4 flex justify-center gap-4 md:gap-8 text-white/50 font-bold font-mono text-[10px] md:text-xs tracking-widest z-20 shrink-0"
            >
                <p>
                    &copy; {new Date().getFullYear()} ZYPO BOOTH. ALL RIGHTS RESERVED.
                </p>
            </motion.div>
        </div>
    );
};

export default Home;
