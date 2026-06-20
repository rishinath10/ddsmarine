const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes
app.get('/', (req, res) => {
    res.render('index', { title: 'DDS Marine Energy Services | Marine Operations Malaysia' });
});

app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us | DDS Marine Energy Services' });
});

app.get('/services', (req, res) => {
    res.render('services', { title: 'Services | DDS Marine Operations & Advisory' });
});

app.get('/partners', (req, res) => {
    res.render('partners', { title: 'Partners | DDS Marine Global Network' });
});

app.get('/projects', (req, res) => {
    res.render('projects', { title: 'Projects & Operations | DDS Marine' });
});

app.get('/team', (req, res) => {
    res.render('team', { title: 'Team | Capt. Dinesh & DDS Marine Leadership' });
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us | DDS Marine Energy Services' });
});

app.get('/thankyou', (req, res) => {
    res.render('thankyou', { title: 'Message Received | DDS Marine' });
});

// Contact form handler (replacing send_mail.php)
app.post('/send-mail', (req, res) => {
    const { name, company, email, phone, subject, message } = req.body;
    
    // Simulate sending email since SMTP is not configured yet
    console.log(`Received contact form submission from ${name} (${email}) - Subject: ${subject}`);
    
    // Redirect to thank you page
    res.redirect('/thankyou');
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Page Not Found | DDS Marine' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
