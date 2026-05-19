import { useEffect } from "react";

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";

const GoogleTranslate = () => {
  useEffect(() => {
   

    // If script already loaded and widget already initialized, skip
    if (window.googleTranslateReady) {
     
      return;
    }

    // Define callback before loading script
    window.googleTranslateElementInit = () => {
  
      if (!window.google?.translate?.TranslateElement) {
        console.error("[GoogleTranslate] google.translate.TranslateElement not found!");
        return;
      }

      // Avoid double-init
      if (window.googleTranslateInstance) {
    
        return;
      }

      try {

        window.googleTranslateInstance = new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            autoDisplay: false,
            includedLanguages: '',
          },
          ELEMENT_ID
        );

        // Poll until .goog-te-combo is ready
        let count = 0;
        const poll = setInterval(() => {
          count++;
          const select = document.querySelector(".goog-te-combo");

          if (select && select.options.length > 1) {
         
            window.googleTranslateReady = true;

            // Apply saved non-English language on init
            let saved = localStorage.getItem("siteLang");
            if (saved && saved.startsWith("en-")) {
             
              saved = "en-US"; // dropdown uses en-US
            }

            if (saved) {
              const baseLang = saved.split("-")[0];
        
              if (baseLang !== "en") {
                select.value = baseLang;
                select.dispatchEvent(new Event("change", { bubbles: true }));
              } else {
                // If saved is English, ensure it shows original
                select.value = "";
                select.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }

            clearInterval(poll);
          }

          if (count > 40) {
            console.warn("[GoogleTranslate] Widget polling timed out (20s).");
            clearInterval(poll);
          }
        }, 500);

      } catch (e) {
        console.error("[GoogleTranslate] Init error:", e.message);
      }
    };

    // Load script only once
    if (!document.getElementById(SCRIPT_ID)) {

      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = `https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit`;
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate) {

      // Script already in DOM, call init again
      window.googleTranslateElementInit();
    }
  }, []);

  // Element must be rendered (not display:none) for Google to inject into it
  return (
    <div
      id={ELEMENT_ID}
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
};

export default GoogleTranslate;
