/**
 * Formats a string with parameters.
 * Example: formatString("Hello {0}", "World") => "Hello World"
 */
export const formatString = (template: string, ...args: any[]): string => {
  return template.replace(/{(\d+)}/g, (match, index) => {
    return typeof args[index] !== 'undefined' ? String(args[index]) : match;
  });
};

/**
 * Gets a random item from an array
 */
export const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
}; 