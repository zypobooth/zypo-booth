import React, { useState } from 'react';
import HamsterLoader from './Loader/HamsterLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Loader2, DollarSign, MessageSquare, User, Mail, QrCode } from 'lucide-react';
import bagibagiDonate from '../assets/bagibagi-donate.webp';

const DonateModal = ({ isOpen, onClose }) => {
    const [step, setStep] = useState('form'); // 'form' | 'loading' | 'qris'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: '',
        amount: 10000
    });
    const [qrisData, setQrisData] = useState(null);
    const [error, setError] = useState(null);

    // Preset amounts
    const amounts = [10000, 20000, 50000, 100000];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAmountSelect = (amount) => {
        setFormData({ ...formData, amount });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStep('loading');
        setError(null);

        try {
            const response = await fetch('/api/create-qris', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success && data.data) {
                setQrisData(data.data);
                setStep('qris');
            } else {
                setError(data.message || 'Failed to create transaction');
                setStep('form');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setStep('form');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative border-4 border-black"
                    >
                        {/* Header */}
                        <div className="bg-[#face10] p-4 sm:p-6 flex justify-between items-center border-b-4 border-black">
                            <h2 className="text-xl sm:text-2xl font-titan text-black flex items-center gap-2">
                                <Heart className="fill-red-500 text-black" />
                                SUPPORT US
                            </h2>
                            <button
                                onClick={onClose}
                                className="bg-black/10 hover:bg-black/20 p-2 rounded-full transition-colors"
                            >
                                <X className="text-black" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                            {step === 'form' && (
                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    {error && (
                                        <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm font-bold border-2 border-red-200">
                                            {error}
                                        </div>
                                    )}

                                    {/* Amount Selection */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Amount</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {amounts.map((amt) => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => handleAmountSelect(amt)}
                                                    className={`py-2 px-1 rounded-xl text-sm font-bold border-2 transition-all ${formData.amount === amt
                                                        ? 'bg-black text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transform -translate-y-[1px]'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-black'
                                                        }`}
                                                >
                                                    {amt.toLocaleString('id-ID')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Amount Input */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 font-bold">Rp</span>
                                        </div>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            min="1000"
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none font-bold font-mono transition-colors text-black"
                                            placeholder="Custom Amount"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="relative">
                                            <User className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors text-black"
                                                placeholder="Your Name (or Alias)"
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <Mail className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors text-black"
                                                placeholder="Email for Receipt"
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <MessageSquare className="absolute top-3.5 left-3 text-gray-400 w-5 h-5" />
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none min-h-[80px] transition-colors text-black"
                                                placeholder="Say something nice... (Support message)"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        className="w-full btn-game-success btn-cute text-black font-titan text-xl py-4 rounded-xl shadow-game mt-2 flex items-center justify-center gap-2 group"
                                    >
                                        GENERATE QRIS
                                        <QrCode className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    </motion.button>

                                    <div className="text-center flex justify-center mt-2">
                                        <img src={bagibagiDonate} alt="Powered by BagiBagi" className="h-6 opacity-60" />
                                    </div>
                                </form>
                            )}

                            {step === 'loading' && (
                                <div className="py-8 flex flex-col items-center justify-center">
                                    <HamsterLoader message="PREPARING QRIS..." size={0.7} />
                                </div>
                            )}

                            {step === 'qris' && qrisData && (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="bg-white p-4 rounded-xl border-4 border-black shadow-lg relative">
                                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-[#face10] text-black text-xs font-bold px-2 py-1 border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                                            SCAN ME
                                        </div>
                                        {/* QRIS Display */}
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrisData.qrisCode)}`}
                                            alt="QRIS Code"
                                            className="w-full max-w-[250px] aspect-square object-contain"
                                        />
                                    </div>

                                    <div className="text-center space-y-2 w-full">
                                        <p className="font-bold text-gray-500 text-sm">Scan with any e-wallet / banking app</p>
                                        <div className="bg-gray-100 p-4 rounded-xl border-2 border-gray-200">
                                            <h3 className="text-3xl font-titan font-mono text-black">Rp {qrisData.amount.toLocaleString('id-ID')}</h3>
                                        </div>
                                        <p className="font-mono text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                            Expires at: {new Date(qrisData.expiredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>

                                    <div className="w-full bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500 text-left">
                                        <p className="text-sm text-blue-800 font-bold mb-1">Payment Instructions:</p>
                                        <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                                            <li>Open your preferred banking or e-wallet app (GoPay, OVO, Dana, BCA, etc.)</li>
                                            <li>Select "Scan QRIS"</li>
                                            <li>Scan the code above</li>
                                            <li>Check payment details match <strong>BagiBagi</strong></li>
                                        </ul>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="w-full btn-game-primary btn-cute text-white font-bold py-3 rounded-xl shadow-game"
                                    >
                                        CLOSE
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DonateModal;
