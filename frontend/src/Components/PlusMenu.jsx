import { useState, useCallback } from 'react';
// Import only the icons needed for the FAB menu and the central icon
import { FileText, Quote, Users } from 'lucide-react';

const FloatingAction = ({ label, icon, onClick, style }) => (
  <div
    className="absolute left-1/2 flex flex-row-reverse items-center space-x-3 space-x-reverse cursor-pointer transition-all duration-300 transform origin-bottom-left pointer-events-auto"
    style={style}
    onClick={onClick}
  >
    {/* Action Label */}
    <span className="text-sm font-medium text-gray-800 bg-white px-3 py-1 rounded-full shadow-lg whitespace-nowrap border border-gray-200 shadow-xl">
      {label}
    </span>
    {/* Action Circle Button */}
    <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 shadow-xl shrink-0">
      {icon}
    </div>
  </div>
);


// --- 2. Action Data Definition ---
const QUICK_ACTIONS = [
  { label: "Invoice", action: "Invoice", icon: <FileText className="w-5 h-5" /> },
  { label: "Book Invoice", action: "BookInvoice", icon: <FileText className="w-5 h-5" /> },
  { label: "Quotation", action: "Quotation", icon: <Quote className="w-5 h-5" /> },
  { label: "Client", action: "Client", icon: <Users className="w-5 h-5" /> },
  { label: "Billing", action: "Billing", icon: <Users className="w-5 h-5" /> },
  { label: "Inventory", action: "Inventory", icon: <Users className="w-5 h-5" /> },
];


// --- 3. Main Component: Plus Icon Feature Only ---


const PlusMenu = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);


  // Simulated function that runs when an action item is clicked
  const handleCreateAction = (action) => {

    toggleMenu(); // Close the menu after action
  };
  const RADIUS = 150; // Distance of action items
  const BASE_BOTTOM = 36; // Vertical center of the main FAB


  // [Index 0: Invoice, Index 1: Quotation, Index 2: Client]
  const TARGET_ANGLES = [165, 145, 125, 105, 85, 65];
  const getStyle = (index) => {
    // Look up the custom angle for the current index
    const angleInDegrees = TARGET_ANGLES[index];
    const angleInRadians = angleInDegrees * (Math.PI / 180);


    // Calculate Cartesian coordinates from polar coordinates
    const offsetX = RADIUS * Math.cos(angleInRadians);
    const offsetY = RADIUS * Math.sin(angleInRadians);


    return {
      bottom: `${BASE_BOTTOM}px`, // Fixed starting height
      opacity: isMenuOpen ? 1 : 0,

      // KEY: Uses transform: translate to move items into the arc
      transform: isMenuOpen
        ? `translate(calc(-50% + ${offsetX}px), ${-offsetY}px) scale(1)`
        : `translate(calc(-50% + 0px), 0px) scale(0)`, // Center point when closed

      zIndex: 45 - index,
      transition: isMenuOpen ? 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s' : 'transform 0.3s ease-in, opacity 0.3s',
    };
  };



  return (
    <>
      {/* --- 4. Quick Action Exploding Menu (Overlay) --- */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        style={{ backgroundColor: isMenuOpen ? 'rgba(0, 0, 0, 0.5)' : 'transparent' }}
        onClick={toggleMenu} // Close menu when clicking backdrop
      >
        {/* Map over the action array to render the menu items */}
        {QUICK_ACTIONS.map((action, index) => (
          <FloatingAction
            key={action.action}
            label={action.label}
            icon={action.icon}
            onClick={() => handleCreateAction(action.action)}
            style={getStyle(index)}
          />
        ))}
      </div>


      {/* --- 5. Mobile Bottom FAB Button (Fixed) --- */}
      <nav className='fixed bottom-4 left-0 right-0 z-50 flex items-center justify-center'>
        <div className='bg-white rounded-full shadow-xl p-2 flex items-center gap-3 border border-white/20 mx-4'>

          {/* Minimal structure to allow the FAB to exist */}
          <div className='w-12 h-12'></div>
          <div className='w-12 h-12'></div>

          {/* Central Plus Icon (Toggle Button) - The FAB JSX */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-2xl transition transform duration-300 cursor-pointer ${isMenuOpen
              ? 'bg-red-500 rotate-45' // Becomes 'X' and turns red when open
              : 'bg-gradient-to-br from-yellow-400 to-yellow-600' // Plus icon when closed
              }`}
            onClick={toggleMenu}
          >
            {/* SVG for the Plus/X icon */}
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>

          {/* Minimal structure to allow the FAB to exist */}
          <div className='w-12 h-12'></div>
          <div className='w-12 h-12'></div>

        </div>
      </nav>
    </>
  );
}


// Export the component
export default PlusMenu;
