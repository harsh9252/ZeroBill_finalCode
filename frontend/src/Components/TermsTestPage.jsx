import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { termsConditionsAPI } from '../utils/api';
import { FileText, Loader } from 'lucide-react';

// Add custom CSS for list styling
const listStyles = `
  .prose ul, .prose ol {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
    padding-left: 1.5em;
  }
  .prose ul li, .prose ol li {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
  .prose p {
    margin-top: 0.5em;
    margin-bottom: 0.5em;
  }
  .prose strong {
    font-weight: 600;
    color: #1f2937;
  }
  .prose ul[style*="disc"] {
    list-style-type: disc;
  }
  .prose ul[style*="circle"] {
    list-style-type: circle;
  }
  .prose ul[style*="square"] {
    list-style-type: square;
  }
  .prose ol[style*="decimal"] {
    list-style-type: decimal;
  }
  .prose ol[style*="lower-alpha"] {
    list-style-type: lower-alpha;
  }
  .prose ol[style*="upper-alpha"] {
    list-style-type: upper-alpha;
  }
  .prose ol[style*="lower-roman"] {
    list-style-type: lower-roman;
  }
  .prose ol[style*="upper-roman"] {
    list-style-type: upper-roman;
  }
`;

function TermsTestPage() {
  const [quotationId, setQuotationId] = useState('66');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTerms = async () => {
    if (!quotationId) {
      setError('Please enter a quotation ID');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {

      const response = await termsConditionsAPI.getByQuotationId(quotationId);
      
      if (response.success) {
        setTerms(response.data || []);
        if (!response.data || response.data.length === 0) {
          setError('No terms & conditions found for this quotation');
        }
      } else {
        setError(response.message || 'Failed to fetch terms');
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
      setError(err.message || 'An error occurred while fetching terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-fetch on mount
    fetchTerms();
  }, []);

  return (
    <>
      <style>{listStyles}</style>
      <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-[#129046] to-[#9ccc53] rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Terms & Conditions Test Page
            </h1>
          </div>

          <div className="flex gap-3 mb-6">
            <input
              type="number"
              value={quotationId}
              onChange={(e) => setQuotationId(e.target.value)}
              placeholder="Enter Quotation ID"
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-[#129046] focus:ring-1 focus:ring-green-400 focus:outline-none"
            />
            <button
              onClick={fetchTerms}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white rounded-xl font-medium hover:from-[#129046]/90 hover:to-[#9ccc53]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Fetch Terms'
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && terms.length > 0 && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-600 text-sm font-medium">
              Successfully loaded {terms.length} terms & conditions
              </p>
            </div>
          )}
        </div>

        {!loading && terms.length > 0 && (
          <div className="space-y-4">
            {terms.map((term, index) => (
              <div
                key={term.id || index}
                className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-[#129046]"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-800">
                    {index + 1}. {term.heading}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Order: {term.section_order}
                  </span>
                </div>
                <div 
                  className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(term.content) }}

                  style={{
                    wordBreak: 'break-word'
                  }}
                />
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
                  <span>ID: {term.id}</span>
                  <span>Quotation: {term.quotation_id}</span>
                  <span>Party: {term.party_id}</span>
                  <span>Business: {term.business_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && terms.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No terms & conditions found</p>
            <p className="text-gray-400 text-sm mt-2">
              Try entering a different quotation ID
            </p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

export default TermsTestPage;
