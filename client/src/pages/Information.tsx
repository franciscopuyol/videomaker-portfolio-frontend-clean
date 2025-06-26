import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Instagram, Linkedin, Video, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactForm } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import CustomCursor from "@/components/CustomCursor";
import Navigation from "@/components/Navigation";

export default function Information() {
  const [, setLocation] = useLocation();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get contact settings
  const { data: contactSettings } = useQuery<{ ctaText: string; formEnabled: boolean }>({
    queryKey: ['/api/contact/settings'],
  });

  // Contact form setup
  const form = useForm<ContactForm>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
  });

  // Contact form submission
  const contactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      return await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      setSubmitStatus('success');
      form.reset();
      setTimeout(() => setSubmitStatus('idle'), 5000);
    },
    onError: () => {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    },
  });

  const onSubmit = (data: ContactForm) => {
    contactMutation.mutate(data);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const ctaText = contactSettings?.ctaText || "Let's Chat.";
  const formEnabled = contactSettings?.formEnabled ?? true;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <CustomCursor />
      <Navigation activeSection="information" />
      
      
      
      <div className="relative z-10 pt-16 sm:pt-20 md:pt-32 pb-12 md:pb-16 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-black mb-6 contact-title site-title" style={{ fontFamily: '"Satoshi Black", "General Sans Black", "Inter Black", system-ui, sans-serif', fontWeight: 900, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{ctaText}</h1>
            <div className="w-24 h-1 bg-red-500 mx-auto"></div>
          </motion.div>

          {/* Contact Information - Reordered */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-12 mb-16"
          >
            {/* Email Section */}
            <div className="text-center">
              <h3 className="text-2xl font-medium mb-4 text-white">Email</h3>
              <a 
                href="mailto:franciscopuyol@gmail.com" 
                className="text-xl text-gray-300 hover:text-red-500 transition-colors"
              >
                franciscopuyol@gmail.com
              </a>
            </div>

            {/* Social Media Section */}
            <div className="text-center">
              <h3 className="text-2xl font-medium mb-6 text-white">Social Media</h3>
              <div className="flex justify-center space-x-4 sm:space-x-6 md:space-x-8">
                <a 
                  href="https://instagram.com/franciscopuyol" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group min-h-[64px] min-w-[64px] touch-manipulation p-2 sm:p-1"
                >
                  <Instagram className="w-7 h-7 md:w-8 md:h-8 mb-2 text-gray-300 group-hover:text-red-500 transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-red-500 transition-colors">Instagram</span>
                </a>
                <a 
                  href="https://www.linkedin.com/in/francisco-puyol-ba380442/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group min-h-[64px] min-w-[64px] touch-manipulation p-2 sm:p-1"
                >
                  <Linkedin className="w-7 h-7 md:w-8 md:h-8 mb-2 text-gray-300 group-hover:text-red-500 transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-red-500 transition-colors">LinkedIn</span>
                </a>
                <a 
                  href="https://vimeo.com/franciscopuyol" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center group min-h-[64px] min-w-[64px] touch-manipulation p-2 sm:p-1"
                >
                  <Video className="w-7 h-7 md:w-8 md:h-8 mb-2 text-gray-300 group-hover:text-red-500 transition-colors" />
                  <span className="text-sm text-gray-300 group-hover:text-red-500 transition-colors">Vimeo</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          {formEnabled ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-16"
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm">Name (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Your name"
                            className="bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm">Email *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="your.email@example.com"
                            className="bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300 text-sm">Message *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Tell me about your project or just say hello..."
                            rows={4}
                            className="bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 resize-none"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-center pt-2">
                    <Button
                      type="submit"
                      disabled={contactMutation.isPending || submitStatus === 'success'}
                      className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-sm tracking-wide transition-all duration-300 disabled:opacity-50"
                    >
                      {contactMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Sending...
                        </>
                      ) : submitStatus === 'success' ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Sent!
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Status Messages */}
                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-green-400 text-sm"
                    >
                      <div className="flex items-center justify-center">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Message sent successfully! I'll get back to you soon.
                      </div>
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-red-400 text-sm"
                    >
                      <div className="flex items-center justify-center mb-2">
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Failed to send message.
                      </div>
                      <a 
                        href={`mailto:franciscopuyol@gmail.com?subject=Portfolio Contact${form.getValues('name') ? ` from ${form.getValues('name')}` : ''}&body=${encodeURIComponent(form.getValues('message') || '')}`}
                        className="text-red-400 hover:text-red-300 underline"
                      >
                        Click here to open your email client
                      </a>
                    </motion.div>
                  )}
                </form>
              </Form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center mb-16 text-gray-400"
            >
              Contact form is temporarily disabled. Please contact directly via email.
            </motion.div>
          )}

          {/* Closing Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center"
          >
            <p className="text-gray-400 text-sm">
              Let's work together — or just grab a coffee
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}