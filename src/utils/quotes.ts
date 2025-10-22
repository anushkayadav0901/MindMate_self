export interface Quote {
    text: string;
    author: string;
  }
  
  export async function fetchMotivationalQuote(): Promise<Quote> {
    try {
      const response = await fetch('https://zenquotes.io/api/random');
      const data = await response.json();
  
      // Fix: Use optional chaining instead of && checks
      if (data?.[0]) {
        return {
          text: data[0].q,
          author: data[0].a,
        };
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
    }
  
    return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  }
  
  const fallbackQuotes: Quote[] = [
    {
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs"
    },
    {
      text: "Believe you can and you're halfway there.",
      author: "Theodore Roosevelt"
    },
    {
      text: "Your time is limited, don't waste it living someone else's life.",
      author: "Steve Jobs"
    },
    {
      text: "The future belongs to those who believe in the beauty of their dreams.",
      author: "Eleanor Roosevelt"
    },
    {
      text: "It does not matter how slowly you go as long as you do not stop.",
      author: "Confucius"
    },
    {
      text: "Everything you've ever wanted is on the other side of fear.",
      author: "George Addair"
    },
    {
      text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
      author: "Winston Churchill"
    },
    {
      text: "The way to get started is to quit talking and begin doing.",
      author: "Walt Disney"
    },
    {
      text: "Don't watch the clock; do what it does. Keep going.",
      author: "Sam Levenson"
    },
    {
      text: "The only impossible journey is the one you never begin.",
      author: "Tony Robbins"
    }
  ];