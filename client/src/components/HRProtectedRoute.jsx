import { Navigate } from 'react-router-dom';

export default function HRProtectedRoute({ children }) {
    const token = localStorage.getItem('hrToken');
    const userStr = localStorage.getItem('hrUser');

    if (!token || !userStr) {
        return <Navigate to="/hr/login" replace />;
    }

    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'hr') {
            return <Navigate to="/hr/login" replace />;
        }
    } catch {
        return <Navigate to="/hr/login" replace />;
    }

    return children;
}
