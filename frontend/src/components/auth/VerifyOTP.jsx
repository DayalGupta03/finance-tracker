import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function VerifyOTP() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef([]);
    const { verifyOtp, resendOtp } = useAuth();
    const toast = useToast();
    const nav = useNavigate();
    const location = useLocation();

    // Get email from navigation state or redirect to register
    const email = location.state?.email;
    const previewUrl = location.state?.previewUrl;

    useEffect(() => {
        if (!email) {
            nav('/register', { replace: true });
            return;
        }
        // Auto-focus first input
        inputRefs.current[0]?.focus();
    }, [email]);

    // Cooldown timer
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown(c => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto-advance to next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 entered
        if (value && index === 5 && newOtp.every(d => d !== '')) {
            handleSubmit(null, newOtp.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            // Move focus back on backspace when current is empty
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const digits = pasted.split('');
            setOtp(digits);
            inputRefs.current[5]?.focus();
            // Auto-submit
            setTimeout(() => handleSubmit(null, pasted), 100);
        }
    };

    const handleSubmit = async (e, otpString) => {
        if (e) e.preventDefault();
        const code = otpString || otp.join('');
        if (code.length !== 6) {
            toast.error('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(email, code);
            toast.success('Email verified! Welcome to FinTrack 🎉');
            nav('/', { replace: true });
        } catch (err) {
            const data = err.response?.data;
            toast.error(data?.error || 'Verification failed');

            if (data?.expired || data?.locked) {
                // Clear inputs for new OTP
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0) return;
        setResending(true);
        try {
            const data = await resendOtp(email);
            toast.success('New code sent to your email!');
            setCooldown(60);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            // Log preview URL if returned (dev mode)
            if (data?.previewUrl) {
                console.log('📬 New OTP preview:', data.previewUrl);
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.retryAfter) {
                setCooldown(data.retryAfter);
            }
            toast.error(data?.error || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    if (!email) return null;

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">✉️</div>
                    <h1>Verify Your Email</h1>
                    <p>
                        We sent a 6-digit code to<br />
                        <strong>{email}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="otp-inputs" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleChange(index, e.target.value)}
                                onKeyDown={e => handleKeyDown(index, e)}
                                className="otp-input"
                                disabled={loading}
                                autoComplete="one-time-code"
                            />
                        ))}
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading || otp.some(d => !d)}>
                        {loading ? 'Verifying…' : 'Verify Email'}
                    </button>
                </form>

                <div className="otp-footer">
                    <p>Didn't receive the code?</p>
                    <button
                        onClick={handleResend}
                        className="resend-btn"
                        disabled={resending || cooldown > 0}
                    >
                        {resending
                            ? 'Sending…'
                            : cooldown > 0
                                ? `Resend in ${cooldown}s`
                                : 'Resend Code'}
                    </button>
                </div>

                {/* Dev mode: Ethereal preview link */}
                {previewUrl && (
                    <div style={{
                        marginTop: '1rem', padding: '0.65rem', background: 'var(--bg-overlay)',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)',
                        textAlign: 'center', wordBreak: 'break-all'
                    }}>
                        <strong>Dev:</strong>{' '}
                        <a href={previewUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>
                            View email in Ethereal →
                        </a>
                    </div>
                )}

                <p className="auth-switch">
                    Wrong email? <Link to="/register">Go back</Link>
                </p>
            </div>
        </div>
    );
}
