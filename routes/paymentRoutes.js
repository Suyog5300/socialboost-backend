// const express = require('express');
// const router = express.Router();

// // Initialize Stripe with your secret key
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// // Route to create a payment intent
// router.post('/api/create-payment-intent', async (req, res) => {
//   try {
//     const { paymentMethodId, amount, currency, customer, metadata } = req.body;
    
//     // First, create or retrieve a customer
//     let stripeCustomer;
//     if (customer.email) {
//       // Look up customer by email first
//       const customers = await stripe.customers.list({
//         email: customer.email,
//         limit: 1,
//       });
      
//       if (customers.data.length > 0) {
//         stripeCustomer = customers.data[0];
//       } else {
//         // Create a new customer
//         stripeCustomer = await stripe.customers.create({
//           name: customer.name,
//           email: customer.email,
//         });
//       }
//     } else {
//       // Create anonymous customer
//       stripeCustomer = await stripe.customers.create({
//         name: customer.name,
//       });
//     }
    
//     // Attach the payment method to the customer
//     await stripe.paymentMethods.attach(paymentMethodId, {
//       customer: stripeCustomer.id,
//     });
    
//     // Set this payment method as the default
//     await stripe.customers.update(stripeCustomer.id, {
//       invoice_settings: {
//         default_payment_method: paymentMethodId,
//       },
//     });
    
//     // Create the payment intent
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount,
//       currency,
//       customer: stripeCustomer.id,
//       payment_method: paymentMethodId,
//       off_session: true,
//       confirm: true,
//       metadata,
//     });
    
//     // Generate a unique order ID
//     const orderId = `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
//     // Return the client secret and order ID
//     res.json({
//       success: true,
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id,
//       orderId,
//       requiresAction: paymentIntent.status === 'requires_action',
//     });
//   } catch (error) {
//     console.error('Error creating payment intent:', error);
    
//     // Handle Stripe-specific errors
//     if (error.type === 'StripeCardError') {
//       return res.status(400).json({
//         error: true,
//         message: error.message,
//       });
//     }
    
//     res.status(500).json({
//       error: true,
//       message: 'An error occurred while processing your payment. Please try again.',
//     });
//   }
// });

// // Add this to your existing server.js or index.js file

// // Route to get checkout session details
// router.get('/api/checkout-session', async (req, res) => {
//     const { sessionId } = req.query;
    
//     if (!sessionId) {
//       return res.status(400).json({ error: true, message: 'Session ID is required' });
//     }
    
//     try {
//       // Retrieve session from Stripe
//       const session = await stripe.checkout.sessions.retrieve(sessionId);
      
//       // Parse metadata from session
//       const metadata = session.metadata || {};
      
//       // Return relevant details
//       res.json({
//         orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//         planName: metadata.planName || 'Professional',
//         amount: session.amount_total || 4900, // Default to 49.00
//         billing: metadata.billing || 'monthly',
//         status: session.payment_status,
//         customer: session.customer,
//         sessionId: session.id
//       });
//     } catch (error) {
//       console.error('Error retrieving checkout session:', error);
//       res.status(500).json({ 
//         error: true, 
//         message: error.message || 'Failed to retrieve session details' 
//       });
//     }
//   });

// // server.js
// // Add this to your existing server.js or index.js file

// // Route to create a Stripe Checkout session
// router.post('/api/create-checkout-session', async (req, res) => {
//     try {
//       const { planName, planPrice, billing, features, preferences } = req.body;
      
//       // Create Stripe Checkout Session
//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ['card'],
//         line_items: [
//           {
//             price_data: {
//               currency: 'usd',
//               product_data: {
//                 name: `${planName} Plan (${billing})`,
//                 description: features ? features.slice(0, 3).join(', ') + (features.length > 3 ? ', and more' : '') : '',
//               },
//               unit_amount: planPrice * 100, // convert to cents
//             },
//             quantity: 1,
//           },
//         ],
//         mode: billing === 'annual' ? 'subscription' : 'payment', // Choose mode based on billing type
//         success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
//         cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/campaign-preferences`,
//         metadata: {
//           planName,
//           billing,
//           // Store preferences as JSON string (or use a database to store these details)
//           preferences: JSON.stringify({
//             demographicsGender: preferences?.demographics?.gender || '',
//             demographicsAgeCount: preferences?.demographics?.age?.length || 0,
//             interestsCount: preferences?.interests?.length || 0,
//             instagramUsername: preferences?.socialMedia?.username || ''
//           })
//         }
//       });
      
//       // Return the session ID to the client
//       res.json({ sessionId: session.id });
//     } catch (error) {
//       console.error('Error creating checkout session:', error);
//       res.status(500).json({ 
//         error: true, 
//         message: error.message || 'Failed to create checkout session' 
//       });
//     }
//   });
  
//   // Webhook endpoint to handle Stripe events
//   app.post('/api/webhook', async (req, res) => {
//     const payload = req.body;
//     const sig = req.headers['stripe-signature'];
    
//     let event;
    
//     try {
//       // Verify webhook signature
//       event = stripe.webhooks.constructEvent(
//         payload,
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET
//       );
//     } catch (err) {
//       console.error('Webhook signature verification failed:', err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }
    
//     // Handle the event
//     switch (event.type) {
//       case 'checkout.session.completed':
//         const session = event.data.object;
        
//         // Here you would typically:
//         // 1. Fulfill the order (store in database, etc.)
//         // 2. Send confirmation email
//         console.log('Payment successful for session:', session.id);
        
//         // You can access your metadata
//         const metadata = session.metadata;
//         console.log('Order metadata:', metadata);
        
//         break;
//       case 'payment_intent.succeeded':
//         const paymentIntent = event.data.object;
//         console.log('PaymentIntent succeeded:', paymentIntent.id);
//         break;
//       // Add more event types as needed
//       default:
//         console.log(`Unhandled event type: ${event.type}`);
//     }
    
//     res.status(200).json({received: true});
//   });

//   module.exports = router;