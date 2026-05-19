import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Rocket, X, CheckCircle2, ShieldAlert } from 'lucide-react';

const PlanExpiryModal = ({ isOpen, onClose, onUpgrade, expiryDate }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop with blur */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="relative w-full max-w-md overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-200"
                >
                    {/* Top Decorative Banner */}
                    <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8">
                        {/* Icon Section */}
                        <div className="flex justify-center mb-6">
                            <motion.div
                                initial={{ rotate: -10, scale: 0.5 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="relative"
                            >
                                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center transform rotate-12 shadow-inner">
                                    <ShieldAlert size={44} className="text-red-500 transform -rotate-12" />
                                </div>
                                {/* Floating Micro-particles */}
                                <motion.div
                                    animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                    className="absolute -top-2 -right-2 w-3 h-3 bg-red-400 rounded-full"
                                />
                                <motion.div
                                    animate={{ y: [0, -15, 0], opacity: [0, 1, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.5, delay: 0.2 }}
                                    className="absolute bottom-2 -left-3 w-2 h-2 bg-orange-400 rounded-full"
                                />
                            </motion.div>
                        </div>

                        {/* Content Section */}
                        <div className="text-center space-y-3">
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-2xl font-extrabold text-slate-900 tracking-tight"
                            >
                                Upgrade to Premium
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="px-4 py-2 bg-red-50 text-red-700 rounded-full inline-flex items-center gap-2 text-sm font-semibold border border-red-100"
                            >
                                <AlertCircle size={14} />
                                Plan Expired {expiryDate ? `on ${new Date(expiryDate).toLocaleDateString()}` : ''}
                            </motion.div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-slate-600 leading-relaxed"
                            >
                                Your access is currently restricted. Upgrade now to unlock all premium features and continue your business growth.
                            </motion.p>
                        </div>

                        {/* Feature Highlights */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mt-8 grid grid-cols-2 gap-3"
                        >
                            {[
                                "Unlimited Invoices",
                                "Priority Support",
                                "Advanced Reports",
                                "Multi-user Access"
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                    <CheckCircle2 size={12} className="text-emerald-500" />
                                    {feature}
                                </div>
                            ))}
                        </motion.div>

                        {/* Actions */}
                        <div className="mt-10 flex flex-col gap-3">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onUpgrade}
                                className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all group"
                            >
                                <Rocket size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Unlock Premium Now
                            </motion.button>

                            <button
                                onClick={onClose}
                                className="w-full h-12 text-slate-500 font-medium hover:text-slate-700 transition-colors"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PlanExpiryModal;
