import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ onOpen, onClose, isOpen, onCloseOther }) {
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh', name: '中文 (简体)', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
    { code: 'ur', name: 'اردو', flag: '🇵🇰' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
    { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' }
  ];

  const currentLanguage = languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleToggle = () => {
    if (isOpen) onClose();
    else { onCloseOther(); onOpen(); }
  };

  const handleLanguageChange = (langCode) => {

    // This component is now legacy. Translation is handled globally.
    // We can potentially redirect to the global handleLanguageChange if passed as prop.
    onClose();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
        aria-label="Change language"
      >
        <Globe className="h-5 w-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Sticky header */}
          <div className="px-4 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Select Language</p>
          </div>

          {/* Scrollable list: ~10 items visible */}
          <div className="max-h-96 overflow-y-auto overscroll-contain">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                  currentLanguage.code === lang.code ? 'bg-yellow-50' : ''
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span
                  className={`text-sm font-medium ${
                    currentLanguage.code === lang.code ? 'text-yellow-600' : 'text-gray-700'
                  }`}
                >
                  {lang.name}
                </span>
                {currentLanguage.code === lang.code && (
                  <span className="ml-auto text-yellow-600">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
