import { useState } from 'react';

export default function PincodeTest() {
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);

  const testPincodeAPI = async (pincodeValue) => {
    if (pincodeValue.length !== 6) return;
    
    setLoading(true);
   
    
    try {
      // Test the external API directly
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`);
      const data = await response.json();
      
     
      
      if (data && data.length > 0 && data[0].Status === 'Success') {
        const postOffice = data[0].PostOffice[0];
        setCity(postOffice.District);
        setState(postOffice.State);
      
      } else {
    
        setCity('');
        setState('');
      }
    } catch (error) {
    
      setCity('');
      setState('');
    } finally {
      setLoading(false);
    }
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setPincode(value);
      if (value.length === 6) {
        testPincodeAPI(value);
      } else {
        setCity('');
        setState('');
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Pincode API Test</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Pincode
        </label>
        <input
          type="text"
          value={pincode}
          onChange={handlePincodeChange}
          placeholder="Enter 6-digit pincode"
          maxLength="6"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {pincode.length === 6 && (
          <p className="text-xs text-green-600 mt-1">✓ Fetching city data...</p>
        )}
      </div>

      {loading && (
        <div className="text-center text-blue-600 mb-4">
          Loading...
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          City
        </label>
        <input
          type="text"
          value={city}
          readOnly
          placeholder="City will be auto-filled"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          State
        </label>
        <input
          type="text"
          value={state}
          readOnly
          placeholder="State will be auto-filled"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
        />
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>Instructions:</strong></p>
        <p>1. Enter a 6-digit pincode (e.g., 201304)</p>
        <p>2. City and state should auto-fill</p>
        <p>3. Check browser console for logs</p>
      </div>
    </div>
  );
}