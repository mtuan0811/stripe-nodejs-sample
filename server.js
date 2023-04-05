var express = require('express');
var app = express();
const stripe = require('stripe')('sk_test_51MshUBFhtxFf6Im7RwTUCTFEVwEES6OpaezZ0mXSIiJOxJksA3ZX2IQ8sMI1XVp8IYWVr0STVT7OpLQ5RNyEvjRq00StOj9HhC');
const bodyParser = require('body-parser');
// set the view engine to ejs
app.set('view engine', 'ejs');

const endpointSecret = 'whsec_8875e48b3a8c271a27524974efb844c36e9bbd85d3dbef0d1ed71a00ab43a996';

app.post('/webhook', bodyParser.raw({type: 'application/json'}), async (request, response) => {
  const payload = request.body;

  console.log("Got payload: " + payload);

  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.log(err)
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log(event)
  let subscription;
  let status;
  switch (event.type) {
    case 'customer.subscription.trial_will_end':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      break;
    case 'customer.subscription.deleted':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      break;
    case 'customer.subscription.created':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      break;
    case 'customer.subscription.updated':
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
      break;
    case 'checkout.session.completed':
      const session = event.data.object;
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
        session.id,
        {
          expand: ['line_items'],
        }
      );
      const lineItems = sessionWithLineItems.line_items;
      console.log(lineItems);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}.`);
  }
  response.status(200).end();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const YOUR_DOMAIN= 'http://localhost:8080'
app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: 'price_1Msy0uFhtxFf6Im7XcvDckHj',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}/success`,
    cancel_url: `${YOUR_DOMAIN}/cancel`,
  });
  res.redirect(303, session.url);
});


app.post('/create-checkout-session-subscription', async (req, res) => {
  console.log(req.body)
  const prices = await stripe.prices.list({
    lookup_keys: [req.body.lookup_key],
    expand: ['data.product'],
  });
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: 'auto',
    line_items: [
      {
        price: prices.data[0].id,
        // For metered billing, do not pass quantity
        quantity: 1,

      },
    ],
    mode: 'subscription',
    success_url: `${YOUR_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${YOUR_DOMAIN}/cancel`,
  });

  res.redirect(303, session.url);
});

app.post('/create-portal-session', async (req, res) => {
  const { session_id } = req.body;
  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);

  const returnUrl = YOUR_DOMAIN;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer,
    return_url: returnUrl,
  });

  res.redirect(303, portalSession.url);
});

// index page
app.get('/', function(req, res) {
  res.render('pages/index');
});

app.get('/success', function(req, res) {
  res.render('pages/payment_success');
});

app.get('/cancel', function(req, res) {
  res.render('pages/payment_cancel');
});

app.listen(8080);
console.log('Server is listening on port 8080');