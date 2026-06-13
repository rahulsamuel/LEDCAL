'use server';
/**
 * @fileOverview A flow for extracting product information from an image file.
 *
 * - extractProductFromImage - A function that handles extracting product info from an image.
 * - ExtractProductFromImageInput - The input type for the extractProductFromImage function.
 * - ExtractProductFromImageOutput - The return type for the extractProductFromImage function.
 */
import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ExtractProductFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image of a product spec sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractProductFromImageInput = z.infer<typeof ExtractProductFromImageInputSchema>;

// Output schema is the same as the scrape and pdf flows
const ProductOutputSchema = z.object({
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
export type ExtractProductFromImageOutput = z.infer<typeof ProductOutputSchema>;


export async function extractProductFromImage(
  input: ExtractProductFromImageInput
): Promise<ExtractProductFromImageOutput> {
  return extractProductFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractProductFromImagePrompt',
  input: {schema: ExtractProductFromImageInputSchema},
  output: {schema: ProductOutputSchema},
  prompt: `You are an expert at extracting product specifications from images.
    You will be given an image of a product specification sheet.
    Extract the following information from the image content and return it as structured JSON.
    If a value is not found, use a reasonable default or 0.
    For usageType, default to 'indoor'. For isFloor, default to false.

    Image Data URI: {{media url=imageDataUri}}
    `,
});

const extractProductFromImageFlow = ai.defineFlow(
  {
    name: 'extractProductFromImageFlow',
    inputSchema: ExtractProductFromImageInputSchema,
    outputSchema: ProductOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
