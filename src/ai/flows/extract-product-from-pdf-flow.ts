'use server';
/**
 * @fileOverview A flow for extracting product information from a PDF file.
 *
 * - extractProductFromPdf - A function that handles extracting product info from a PDF.
 * - ExtractProductFromPdfInput - The input type for the extractProductFromPdf function.
 * - ExtractProductFromPdfOutput - The return type for the extractProductFromPdf function.
 */
import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {z} from 'genkit';

const ExtractProductFromPdfInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      "A PDF file of a product spec sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:application/pdf;base64,<encoded_data>'."
    ),
});
export type ExtractProductFromPdfInput = z.infer<typeof ExtractProductFromPdfInputSchema>;

// Output schema is the same as the scrape flow
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
export type ExtractProductFromPdfOutput = z.infer<typeof ProductOutputSchema>;


export async function extractProductFromPdf(
  input: ExtractProductFromPdfInput
): Promise<ExtractProductFromPdfOutput> {
  return extractProductFromPdfFlow(input);
}


const extractTextFromPdf = ai.defineTool(
  {
    name: 'extractTextFromPdf',
    description: 'Extracts the text content from a PDF file provided as a data URI.',
    inputSchema: z.object({
      pdfDataUri: z.string().describe('The data URI of the PDF file.'),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    try {
      const pdf = (await import('pdf-parse')).default;
      const base64Data = input.pdfDataUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URI format for PDF.');
      }
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      const data = await pdf(pdfBuffer);
      return data.text;
    } catch (e: any) {
      console.error("Error parsing PDF:", e);
      return `Failed to extract text from PDF: ${e.message}`;
    }
  }
);


const prompt = ai.definePrompt({
  name: 'extractProductFromPdfPrompt',
  input: {schema: ExtractProductFromPdfInputSchema},
  output: {schema: ProductOutputSchema},
  tools: [extractTextFromPdf],
  prompt: `You are an expert at extracting product specifications from text.
    You will be given the content of a product specification sheet PDF.
    Use the 'extractTextFromPdf' tool to get the text content of the PDF.
    Then, extract the following information from the content and return it as structured JSON.
    If a value is not found, use a reasonable default or 0.
    For usageType, default to 'indoor'. For isFloor, default to false.

    PDF Data URI: {{{pdfDataUri}}}
    `,
});

const extractProductFromPdfFlow = ai.defineFlow(
  {
    name: 'extractProductFromPdfFlow',
    inputSchema: ExtractProductFromPdfInputSchema,
    outputSchema: ProductOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
