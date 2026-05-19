import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const DashboardBackButton = ({
    className = "",
    showText = true,
    mobileFullWidth = false
}) => {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate('/admin-dashboard')}
            className="group flex items-center gap-1.5 px-2 py-1.5 border-1 border-yellow-900 rounded-lg hover:bg-yellow-100 hover:border-green-700 transition-all shrink-0"
            title="Back To Dashboard"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-arrow-left w-4 h-4 text-yellow-900 group-hover:text-green-700" aria-hidden="true">
                <path d="m12 19-7-7 7-7"></path>
                <path d="M19 12H5"></path>
            </svg>
            <span className="text-xs font-semibold text-yellow-900 group-hover:text-green-700">Back To Dashboard</span>
        </button>
    );
};

export default DashboardBackButton;
