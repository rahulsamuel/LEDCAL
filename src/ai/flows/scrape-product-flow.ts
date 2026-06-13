'use server';
/**
 * @fileOverview A flow for scraping product information from a URL.
 *
 * - scrapeProduct - A function that handles scraping product info.
 * - ScrapeProductInput - The input type for the scrapeProduct function.
 * - ScrapeProductOutput - The return type for the scrapeProduct function.
 */
import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ScrapeProductInputSchema = z.object({
  url: z.string().url().describe('The URL of the product page to scrape.'),
});
export type ScrapeProductInput = z.infer<typeof ScrapeProductInputSchema>;

const ScrapeProductOutputSchema = z.object({
  name: z.string().describe('The name of the product.'),
  manufacturer: z.string().describe('The manufacturer of the product.'),
  width_px: z.coerce.number().describe('The width of the product in pixels.'),
  height_px: z.coerce.number().describe('The height of the product in pixels.'),
  width_mm: z.coerce.number().describe('The width of the product in millimeters.'),
  height_mm: z.coerce.number().describe('The height of the product in millimeters.'),
  pixel_pitch: z.coerce.number().describe('The pixel pitch of the product in millimeters.'),
  weight_kg: z.coerce.number().describe('The weight of the product in kilograms.'),
  power_watts_max: z.coerce.number().describe('The maximum power consumption in watts.'),
  power_watts_avg: z.coerce.number().describe('The average power consumption in watts.'),
  usageType: z.enum(['indoor', 'outdoor']).describe('Whether the product is for indoor or outdoor use. Default to indoor if not specified.'),
  isFloor: z.boolean().describe('Whether the product is rated for floor use. Default to false if not specified.'),
});
export type ScrapeProductOutput = z.infer<typeof ScrapeProductOutputSchema>;

export async function scrapeProduct(
  input: ScrapeProductInput
): Promise<ScrapeProductOutput> {
  return scrapeProductFlow(input);
}

const fetchUrlContent = ai.defineTool(
  {
    name: 'fetchUrlContent',
    description: 'Fetches the text content of a given URL.',
    inputSchema: z.object({
      url: z.string().url().describe('The URL to fetch content from.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const response = await fetch(input.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Simple text extraction, could be improved with an HTML parser
      const text = await response.text();
      return text.replace(/<style[^>]*>.*<\/style>/gs, '')
                 .replace(/<script[^>]*>.*<\/script>/gs, '')
                 .replace(/<[^>]+>/g, ' ')
                 .replace(/\s\s+/g, ' ')
                 .trim();
    } catch (e: any) {
      return `Failed to fetch URL content: ${e.message}`;
    }
  }
);


const prompt = ai.definePrompt({
  name: 'scrapeProductPrompt',
  input: {schema: ScrapeProductInputSchema},
  output: {schema: ScrapeProductOutputSchema},
  tools: [fetchUrlContent],
  prompt: `You are an expert at extracting product specifications from text.
    You will be given a URL of a product webpage.
    Use the 'fetchUrlContent' tool to get the text content of the page.
    Then, extract the following information from the content and return it as structured JSON.
    If a value is not found, use a reasonable default or 0.
    For usageType, default to 'indoor'. For isFloor, default to false.

    URL: {{{url}}}
    `,
});

const scrapeProductFlow = ai.defineFlow(
  {
    name: 'scrapeProductFlow',
    inputSchema: ScrapeProductInputSchema,
    outputSchema: ScrapeProductOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
