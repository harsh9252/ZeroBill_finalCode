import { FaPencilAlt, FaTrash, FaEye, FaEllipsisV, FaCheckCircle, FaTimesCircle, FaShareAlt, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import '../assets/css/ActionButtons.css';

/**
 * ActionButtons Component
 * 
 * Reusable component for displaying action buttons (Edit, Delete, View, More, Approve, Reject)
 * 
 * Props:
 * - actions: array - array of action names to display
 * - loadingAction: string - the key of the action currently loading
 * - loadingId: string/number - the ID of the row currently loading
 * - currentId: string/number - the ID of this specific row
 */

export default function ActionButtons({
  onEdit,
  onDelete,
  onView,
  onMore,
  onApprove,
  onReject,
  onShare,
  onToggle,
  actions = ['edit', 'delete'],
  isActive = true,
  isDisabled = false,
  loadingAction = null,
  loadingId = null,
  currentId = null,
  className = "",
  buttonClassName = ""
}) {
  // Action button configurations
  const actionConfig = {
    edit: {
      icon: FaPencilAlt,
      type: 'edit',
      label: 'Edit',
      callback: onEdit
    },
    delete: {
      icon: FaTrash,
      type: 'delete',
      label: 'Delete',
      callback: onDelete
    },
    view: {
      icon: FaEye,
      type: 'view',
      label: 'View',
      callback: onView
    },
    more: {
      icon: FaEllipsisV,
      type: 'more',
      label: 'More',
      callback: onMore
    },
    approve: {
      icon: FaCheckCircle,
      type: 'approve',
      label: 'Approve',
      callback: onApprove
    },
    reject: {
      icon: FaTimesCircle,
      type: 'reject',
      label: 'Reject',
      callback: onReject
    },
    share: {
      icon: FaShareAlt,
      type: 'share',
      label: 'Share',
      callback: onShare
    },
    toggle: {
      icon: isActive ? FaUserSlash : FaUserCheck,
      type: isActive ? 'toggle-active' : 'toggle-inactive',
      label: isActive ? 'Deactivate' : 'Activate',
      callback: onToggle
    }
  };

  // Filter actions to display
  const visibleActions = actions.filter(action => actionConfig[action]);

  return (
    <div className={`d-flex justify-content-center gap-2 ${className}`}>
      {visibleActions.map((action) => {
        const config = actionConfig[action];
        const IconComponent = config.icon;
        
        // Determine if this specific action is loading for this specific record
        const isThisActionLoading = loadingAction === action && (loadingId === null || loadingId === currentId);

        if (!config.callback) return null;

        return (
          <button
            key={action}
            onClick={(e) => {
              if (isThisActionLoading || isDisabled) return;
              e.stopPropagation();
              e.preventDefault();
              config.callback(e);
            }}
            className={`action-button ${config.type} ${buttonClassName} ${isThisActionLoading ? 'loading' : ''}`}
            title={config.label}
            disabled={isDisabled || isThisActionLoading}
          >
            {isThisActionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <IconComponent />
            )}
          </button>
        );
      })}
    </div>
  );
}
