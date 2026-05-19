import React from 'react';
import { Plus, Database } from 'lucide-react';

const GeneralEmptyState = ({
    title = "No Data Found",
    description = "You haven't added anything yet. Start by creating your first entry.",
    buttonText = "Create New",
    onButtonClick,
    onIconClick,
    icon: IconComponent
}) => {
    return (
        <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
                {onIconClick ? (
                    <button 
                        onClick={onIconClick}
                        className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6 outline-none border-none cursor-pointer active:scale-95 transition-transform"
                    >
                        {IconComponent ? (
                            <IconComponent className="w-12 h-12 text-green-600" />
                        ) : (
                            <Database className="w-12 h-12 text-green-600" />
                        )}
                    </button>
                ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        {IconComponent ? (
                            <IconComponent className="w-12 h-12 text-green-600" />
                        ) : (
                            <Database className="w-12 h-12 text-green-600" />
                        )}
                    </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{title}</h2>
                <p className="text-gray-600 mb-8">
                    {description}
                </p>
                {onButtonClick && (
                    <button
                        onClick={onButtonClick}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                    >
                        <Plus className="w-5 h-5" />
                        {buttonText}
                    </button>
                )}
            </div>
        </div>
    );
};

export default GeneralEmptyState;
