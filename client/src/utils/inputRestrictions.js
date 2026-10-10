// Input restrictions: rules that clean a value as the user types.
//
//   <Input restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 2 }]} />
//
// Usable on their own too: applyRestrictions("12a.345", [{ name: RESTRICTIONS.DECIMAL, upto: 2 }]) -> "12.34"

export const RESTRICTIONS = {
  MAX_LENGTH: "maxLength", // { max }
  ONLY_NUMBERS: "onlyNumbers", // { allowNegative? }
  DECIMAL: "decimal", // { upto, allowNegative? }
  PHONE: "phone",
};

const stripToNumber = (value, allowDecimal, allowNegative) => {
  const allowed = allowDecimal ? (allowNegative ? /[^\d.-]/g : /[^\d.]/g) : allowNegative ? /[^\d-]/g : /[^\d]/g;
  let result = value.replace(allowed, "");

  if (allowNegative) {
    // A minus is only valid as the first character.
    result = result.replace(/^-+/, "-").replace(/(\d|\.)-+/g, "$1");
  }

  return result;
};

export const applyRestrictions = (value, restrictions = []) => {
  let result = value;

  for (const restriction of restrictions) {
    switch (restriction.name) {
      case RESTRICTIONS.MAX_LENGTH:
        result = result.slice(0, restriction.max);
        break;

      case RESTRICTIONS.ONLY_NUMBERS:
        result = stripToNumber(result, false, restriction.allowNegative ?? false);
        break;

      case RESTRICTIONS.DECIMAL: {
        result = stripToNumber(result, true, restriction.allowNegative ?? false);

        const firstDot = result.indexOf(".");
        if (firstDot !== -1) {
          const integerPart = result.slice(0, firstDot);
          const decimalPart = result
            .slice(firstDot + 1)
            .replace(/\./g, "")
            .slice(0, restriction.upto);

          result = `${integerPart}.${decimalPart}`;
        }
        break;
      }

      case RESTRICTIONS.PHONE:
        // Digits, spaces, dashes and brackets; a plus only as the first character.
        result = result.replace(/[^\d+\-\s()]/g, "").replace(/(?!^)\+/g, "");
        break;

      default:
        break;
    }
  }

  return result;
};
