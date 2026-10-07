import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { errMsg } from '../utils/game';

export function Login() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const user = await login(form);
            toast(`Selamat datang, ${user.team_name || user.name}!`);
            navigate(user.role === 'admin' ? '/admin' : '/', { replace: true });
        } catch (err) {
            toast(errMsg(err, 'Login gagal.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="ff-card rounded-3xl w-full max-w-md p-8">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-midnight-700 to-midnight-400 mx-auto flex items-center justify-center mb-3">
                        <i className="fa-solid fa-futbol text-white text-2xl"></i>
                    </div>
                    <h1 className="font-display text-2xl font-black ff-gradient-text">FOOTBALL-FUN</h1>
                    <p className="text-[10px] text-midnight-300 tracking-[0.3em] uppercase">Midnight Edition</p>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase tracking-wider mb-1 font-semibold">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="nama@email.com"
                            className="w-full bg-midnight-950/80 text-sm text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-midnight-300 uppercase tracking-wider mb-1 font-semibold">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-midnight-950/80 text-sm text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="gold-btn w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        {busy ? 'Masuk...' : 'Masuk'}
                    </button>
                </form>
                <p className="text-center text-xs text-midnight-300 mt-5">
                    Belum punya akun?{' '}
                    <Link to="/register" className="text-midnight-200 font-bold hover:underline">
                        Daftar
                    </Link>
                </p>
                <div className="mt-6 p-3 rounded-xl bg-midnight-950/60 border border-midnight-700/60 text-[11px] text-midnight-300 space-y-1">
                    <p className="font-bold text-midnight-200 uppercase text-[10px]">Akun demo</p>
                    <p>Admin — admin@footballfun.test / password123</p>
                    <p>User — sabian@test.com / password123</p>
                </div>
            </div>
        </div>
    );
}

export function Register() {
    const { register } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', team_name: '', email: '', password: '', password_confirmation: '' });
    const [busy, setBusy] = useState(false);

    const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await register(form);
            toast('Akun dibuat! +1000 coins starter.');
            navigate('/', { replace: true });
        } catch (err) {
            const errors = err?.response?.data?.errors;
            const first = errors ? Object.values(errors)[0]?.[0] : null;
            toast(first || errMsg(err, 'Registrasi gagal.'), 'fa-circle-exclamation');
        } finally {
            setBusy(false);
        }
    };

    const inputCls =
        'w-full bg-midnight-950/80 text-sm text-white p-3 rounded-xl border border-midnight-700 focus:outline-none focus:border-midnight-400 transition';

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="ff-card rounded-3xl w-full max-w-md p-8">
                <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-black ff-gradient-text">DAFTAR AKUN</h1>
                    <p className="text-xs text-midnight-300 mt-1">Buat tim impianmu & dapatkan 1000 coins</p>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <input required value={form.name} onChange={set('name')} placeholder="Nama" className={inputCls} />
                        <input
                            required
                            value={form.team_name}
                            onChange={set('team_name')}
                            placeholder="Nama Tim (cth: Sabian FC)"
                            className={inputCls}
                        />
                    </div>
                    <input
                        required
                        type="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="Email"
                        className={inputCls}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            required
                            type="password"
                            minLength={8}
                            value={form.password}
                            onChange={set('password')}
                            placeholder="Password (min 8)"
                            className={inputCls}
                        />
                        <input
                            required
                            type="password"
                            value={form.password_confirmation}
                            onChange={set('password_confirmation')}
                            placeholder="Konfirmasi"
                            className={inputCls}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={busy}
                        className="gold-btn w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                        {busy ? 'Mendaftar...' : 'Daftar & Main'}
                    </button>
                </form>
                <p className="text-center text-xs text-midnight-300 mt-5">
                    Sudah punya akun?{' '}
                    <Link to="/login" className="text-midnight-200 font-bold hover:underline">
                        Masuk
                    </Link>
                </p>
            </div>
        </div>
    );
}
