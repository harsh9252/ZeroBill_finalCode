// utils/validation.js

// 1️⃣ Exact Length Check
export const validateExactLength = (value, length, fieldName = "Field") => {
  if (!value || value.trim().length !== length) {
    return {
      isValid: false,
      error: `${fieldName} must be exactly ${length} characters long!`,
    };
  }
  return { isValid: true, error: "" };
};

// 2️⃣ Only Text Allowed
export const validateOnlyText = (value, fieldName = "Field") => {
  const textRegex = /^[A-Za-z\s]+$/;
  if (!textRegex.test(value.trim())) {
    return {
      isValid: false,
      error: `${fieldName} should contain only letters!`,
    };
  }
  return { isValid: true, error: "" };
};

// 3️⃣ No Special Characters
export const validateNoSpecialCharacters = (value, fieldName = "Field") => {
  const regex = /^[A-Za-z0-9\s]+$/;
  if (!regex.test(value.trim())) {
    return {
      isValid: false,
      error: `${fieldName} should not contain special characters!`,
    };
  }
  return { isValid: true, error: "" };
};

// 4️⃣ Only Digits with Length Validation
export const validateDigitsWithLength = (value, length, fieldName = "Field") => {
  const digitRegex = /^[0-9]+$/;
  if (!digitRegex.test(value)) {
    return {
      isValid: false,
      error: `${fieldName} should contain only digits!`,
    };
  }
  if (value.length !== length) {
    return {
      isValid: false,
      error: `${fieldName} must be exactly ${length} digits!`,
    };
  }
  return { isValid: true, error: "" };
};

// 5️⃣ Email Validation
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return {
      isValid: false,
      error: `Enter a valid Email address!`,
    };
  }
  return { isValid: true, error: "" };
};

// 6️⃣ PAN Card Format Validation
// export const validatePanCard = (pan) => {
//   const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
//   if (!regex.test(pan.toUpperCase())) {
//     return {
//       isValid: false,
//       error: `Invalid PAN number format! (Example: ABCDE1234F)`,
//     };
//   }
//   return { isValid: true, error: "" };
// };
