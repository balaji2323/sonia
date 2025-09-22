import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Eye, EyeOff, User, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import authStore from '../stores/AuthStore';
import toast from 'react-hot-toast';

const LoginForm = observer(() => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isLogin && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      let result;
      
      if (isLogin) {
        result = await authStore.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        result = await authStore.register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
      }

      if (result.success) {
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
      }
    } catch (error) {
      // Error is handled by the store and displayed via toast
      console.error('Auth error:', error);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    authStore.clearError();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <User size={32} />
          </div>
          <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p>
            {isLogin 
              ? 'Sign in to your AI Customer Support account' 
              : 'Get started with AI Customer Support'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter your username"
                  required={!isLogin}
                  disabled={authStore.isLoading}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
                disabled={authStore.isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                disabled={authStore.isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={authStore.isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required={!isLogin}
                  disabled={authStore.isLoading}
                />
              </div>
            </div>
          )}

          {authStore.error && (
            <div className="error-message">
              {authStore.error}
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={authStore.isLoading}
          >
            {authStore.isLoading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
              </div>
            ) : (
              <>
                {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="toggle-button"
              onClick={toggleMode}
              disabled={authStore.isLoading}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Demo credentials for testing */}
        {process.env.NODE_ENV === 'development' && (
          <div className="demo-credentials">
            <h4>Demo Credentials:</h4>
            <p><strong>Admin:</strong> admin@demo.com / admin123</p>
            <p><strong>User:</strong> user@demo.com / user123</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default LoginForm;