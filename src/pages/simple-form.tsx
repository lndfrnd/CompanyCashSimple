import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneNumber } from '@/lib/utils';
import { FormOverlay } from '@/components/form-overlay';

const PREDEFINED_COLORS = {
  red: '#FF0000',
  orange: '#FFA500',
  yellow: '#FFD700',
  green: '#008000',
  gold: '#FFD700',
  blue: '#0000FF',
  purple: '#800080',
} as const;

const formSchema = z.object({
  fname: z.string().min(2, 'First name must be at least 2 characters'),
  lname: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .refine((val) => {
      const numbers = val.replace(/[^0-9]/g, '');
      return numbers.length === 10;
    }, 'Please enter a valid mobile number')
    .refine((val) => {
      const numbers = val.replace(/[^0-9]/g, '');
      return numbers.startsWith('04');
    }, 'Must be an Australian Mobile'),
  amount: z
    .string()
    .min(1, 'Please enter a loan amount')
    .transform((val) => val.replace(/[^0-9]/g, ''))
    .refine(
      (val) => {
        const num = parseInt(val);
        return num > 0 && num <= 100000000;
      },
      'Loan amount must be between $1 and $100,000,000'
    ),
  lstatus: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface SimpleFormProps {
  settings?: {
    country: string;
    buttonColor: string;
    leadSource: string;
    brand?: string;
    buttonText?: string;
  };
}

export function SimpleForm({ settings }: SimpleFormProps = {}) {
  const { formId } = useParams();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState('');
  const { toast } = useToast();

  // New state: store predicted state/territory from IP lookup.
  const [predictedState, setPredictedState] = useState('');

  // Use a public geolocation API to try and determine the state/territory.
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then((response) => response.json())
      .then((data) => {
        // Only use the predicted state if the visitor is in Australia.
        if (data && data.country_code === 'AU' && data.region) {
          setPredictedState(data.region);
        }
      })
      .catch((err) => {
        console.error('Error fetching geolocation data:', err);
      });
  }, []);

  // Get settings from URL parameters or props
  const colorParam = searchParams.get('color')?.toLowerCase();
  const brandParam = searchParams.get('brand')?.replace(/\+/g, ' ');
  const sourceParam = searchParams.get('source')?.replace(/\+/g, ' ');
  const buttonTextParam = searchParams.get('buttonText')?.replace(/\+/g, ' ');

  const effectiveSettings = {
    country: 'AU', // Force AU
    buttonColor: colorParam 
      ? PREDEFINED_COLORS[colorParam as keyof typeof PREDEFINED_COLORS] || settings?.buttonColor
      : settings?.buttonColor,
    leadSource: 'Business Loan Form', // Always set to this value
    // Default to "LoansOne iFrame" unless overridden by URL params or settings.
    brand: sourceParam || brandParam || settings?.brand || 'LoansOne iFrame',
    buttonText: buttonTextParam || settings?.buttonText || 'Submit',
  };

  const isNZ = effectiveSettings.country === 'NZ';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fname: '',
      lname: '',
      email: '',
      phone: '',
      amount: '',
      lstatus: 'New Lead',
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setSubmittedName(data.fname);

    const basePayload = {
      ...data,
      phone: data.phone.startsWith('0')
        ? '+61' + data.phone.substring(1)
        : data.phone,
      amount: parseInt(data.amount),
      iso: effectiveSettings.country,
      lsource: effectiveSettings.leadSource,
      brand: effectiveSettings.brand,
    };

    const formattedPayload = {
      fname: basePayload.fname,
      lname: basePayload.lname,
      email: basePayload.email,
      phone: basePayload.phone,
      amount: basePayload.amount,
      lstatus: 'New Lead',
      iso: basePayload.iso,
      lead_source: basePayload.lsource,
      brand: basePayload.brand,
    };

    const webhooks = [
      {
        name: 'Formcarry',
        url: 'https://formcarry.com/s/ZIcifdwx6ev',
        mode: 'cors',
      },
      {
        name: 'Cloudflare Worker',
        url: 'https://loansone-simple-iframe-sendtozoho.bailey-3eb.workers.dev/',
        mode: 'no-cors',
      },
    ];

    try {
      await Promise.all(
        webhooks.map(async (webhook) => {
          console.log(`\nSending to ${webhook.name}...`);

          // For the Formcarry endpoint, add extra fields:
          // - submission_url: the URL where the submission originated.
          // - predicted_state: the state/territory determined via IP lookup.
          const payloadToSend =
            webhook.name === 'Formcarry'
              ? {
                  ...formattedPayload,
                  submission_url: document.referrer || window.location.href,
                  predicted_state: predictedState, // e.g. "New South Wales"
                }
              : formattedPayload;

          console.log('Payload:', JSON.stringify(payloadToSend, null, 2));

          try {
            const response = await fetch(webhook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                Accept: 'application/json',
              },
              mode: webhook.mode as RequestMode,
              body: JSON.stringify(payloadToSend),
            });

            const responseText = await response.text();
            console.log(`${webhook.name} Response Status:`, response.status);
            console.log(
              `${webhook.name} Response Headers:`,
              Object.fromEntries(response.headers.entries())
            );
            console.log(`${webhook.name} Response Body:`, responseText);
          } catch (error: any) {
            console.error(`${webhook.name} Error:`, error);
          }
        })
      );

      // If the brand is exactly "LoansOne" (case-insensitive), force a top-level redirect.
      if (effectiveSettings.brand?.toLowerCase() === 'loansone') {
        if (window.top) {
          window.top.location.href = 'https://loansone.com.au/thank-you-unsecured2/';
        } else {
          window.location.href = 'https://loansone.com.au/thank-you-unsecured2/';
        }
        return;
      }
      // Otherwise, the form continues with its original behavior.
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }

  const buttonStyle = effectiveSettings.buttonColor
    ? { backgroundColor: effectiveSettings.buttonColor }
    : undefined;

  return (
    <Card className="relative [&_input:-webkit-autofill]:!bg-white [&_input:-webkit-autofill:hover]:!bg-white [&_input:-webkit-autofill:focus]:!bg-white [&_input:-webkit-autofill:active]:!bg-white [&_input:-webkit-autofill]:!-webkit-text-fill-color-[#000000] [&_input:-webkit-autofill]:!-webkit-box-shadow-[0_0_0_30px_white_inset]">
      <FormOverlay
        isVisible={isSubmitting}
        firstName={submittedName}
        color={effectiveSettings.buttonColor || '#000000'}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-3">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="amount"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel className="text-sm">Loan Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-2 flex items-center h-full">
                        <span className="text-sm">$</span>
                      </div>
                      <Input
                        placeholder="25,000"
                        className="pl-5 h-9 text-sm"
                        {...field}
                        value={
                          value
                            ? value
                                .replace(/[^0-9]/g, '')
                                .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                            : ''
                        }
                        onChange={(e) => {
                          const numericValue = e.target.value.replace(/[^0-9]/g, '');
                          if (parseInt(numericValue) <= 100000000) {
                            onChange(numericValue);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fname"
                render={({ field: { onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="First Name"
                        {...field}
                        onChange={(e) => {
                          const capitalized =
                            e.target.value.charAt(0).toUpperCase() +
                            e.target.value.slice(1);
                          e.target.value = capitalized;
                          onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lname"
                render={({ field: { onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Last Name"
                        {...field}
                        onChange={(e) => {
                          const capitalized =
                            e.target.value.charAt(0).toUpperCase() +
                            e.target.value.slice(1);
                          e.target.value = capitalized;
                          onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      className="bg-background"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 flex items-center h-full">
                        {isNZ ? (
                          '🇳🇿'
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 36 36"
                            xmlns="http://www.w3.org/2000/svg"
                            className="rounded-sm"
                            preserveAspectRatio="xMidYMid meet"
                          >
                            <path
                              fill="#00247D"
                              d="M32 5H4c-.205 0-.407.015-.604.045l-.004 1.754l-2.73-.004A3.984 3.984 0 0 0 0 9v18a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V9a4 4 0 0 0-4-4z"
                            ></path>
                            <path
                              d="M9 26.023l-1.222 1.129l.121-1.66l-1.645-.251l1.373-.94l-.829-1.443l1.591.488L9 21.797l.612 1.549l1.591-.488l-.83 1.443l1.374.94l-1.645.251l.121 1.66zm18.95-16.461l-.799.738l.079-1.086l-1.077-.164l.899-.615l-.542-.944l1.04.319l.4-1.013l.401 1.013l1.041-.319l-.543.944l.898.615l-1.076.164l.079 1.086zm-4 6l-.799.739l.079-1.086l-1.077-.164l.899-.616l-.542-.944l1.04.319l.4-1.013l.401 1.013l1.041-.319l-.543.944l.898.616l-1.076.164l.079 1.086zm9-2l-.799.739l.079-1.086l-1.077-.164l.899-.616l-.542-.944l1.04.319l.4-1.013l.401 1.013l1.041-.319l-.543.944l.898.616l-1.076.164l.079 1.086zm-5 14l-.799.739l.079-1.086l-1.077-.164l.899-.616l-.542-.944l1.04.319l.4-1.013l.401 1.013l1.041-.319l-.543.944l.898.616l-1.076.164l.079 1.086zM31 16l.294.596l.657.095l-.475.463l.112.655L31 17.5l-.588.309l.112-.655l-.475-.463l.657-.095z"
                              fill="#FFF"
                            ></path>
                            <path
                              fill="#00247D"
                              d="M19 18V5H4c-.32 0-.604.045-.604.045l-.004 1.754l-2.73-.004S.62 6.854.535 7A3.988 3.988 0 0 0 0 9v9h19z"
                            ></path>
                            <path
                              fill="#EEE"
                              d="M19 5h-2.331L12 8.269V5H7v2.569L3.396 5.045a3.942 3.942 0 0 0-1.672.665L6.426 9H4.69L.967 6.391a4.15 4.15 0 0 0-.305.404L3.813 9H0v5h3.885L0 16.766V18h3.332L7 15.432V18h5v-3.269L16.668 18H19v-2.029L16.185 14H19V9h-2.814L19 7.029V5z"
                            ></path>
                            <path
                              fill="#CF1B2B"
                              d="M11 5H8v5H0v3h8v5h3v-5h8v-3h-8z"
                            ></path>
                            <path
                              fill="#CF1B2B"
                              d="M19 5h-1.461L12 8.879V9h1.571L19 5.198zm-17.276.71a4.052 4.052 0 0 0-.757.681L4.69 9h1.735L1.724 5.71zM6.437 14L.734 18h1.727L7 14.822V14zM19 17.802v-1.22L15.313 14H13.57z"
                            ></path>
                          </svg>
                        )}
                      </div>
                      <Input
                        placeholder={isNZ ? '02' : '04'}
                        className="pl-10"
                        {...field}
                        value={formatPhoneNumber(value, effectiveSettings.country)}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/[^0-9]/g, '');
                          if (numbers.length <= 10) {
                            onChange(numbers);
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              className="w-full bg-black hover:bg-black/90 text-white"
              style={{
                backgroundColor: buttonStyle?.backgroundColor || '#000000',
                color: buttonStyle?.color || '#ffffff',
              }}
            >
              {effectiveSettings.buttonText}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              By clicking the {effectiveSettings.buttonText} button, you agree to the privacy policy on this website
            </p>
          </div>
        </form>
      </Form>
    </Card>
  );
}
