'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function LoginPage() {
    const router = useRouter();
    const [user, setUser] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const url = 'https://temproraryapi/login'; 
    const handleChange = (e) => {
        setUser({ ...user, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post(url, user);
            console.log(response.data);

            const token = response.data.token;
            localStorage.setItem('token', token);

            if (response.data.user.role === 'admin') {
                router.push('/');  
            } else {
                router.push('/login');
            }
        } catch (err) {
            console.error('There was an error!', err);
            setError('Login failed. Check your credentials.');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto' }}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label>Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={user.email}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={user.password}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '5px' }}
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" style={{ padding: '5px 10px' }}>Login</button>
            </form>
        </div>
    );
}
