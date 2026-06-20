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

// Static SEO files
app.get('/robots.txt', (req, res) => res.sendFile(path.join(__dirname, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.sendFile(path.join(__dirname, 'sitemap.xml')));

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        title: 'DDS Marine Energy Services | Marine Operations Malaysia',
        description: 'DDS Marine provides STS operations, pilotage, bunkering, chartering and marine advisory from Penang across the Straits of Malacca.',
        path: '/'
    });
});

app.get('/about', (req, res) => {
    res.render('about', { 
        title: 'About Us | DDS Marine Energy Services',
        description: 'Learn about DDS Marine Energy Services, our history since 2020, and our commitment to safety, integrity, and global maritime excellence.',
        path: '/about',
        ogImage: 'https://www.ddsmarine.com/assets/offshore-rig.jpg'
    });
});

app.get('/services', (req, res) => {
    res.render('services', { 
        title: 'Services | DDS Marine Operations & Advisory',
        description: 'Comprehensive marine solutions including Ship-to-Ship (STS) transfers, deep-draft pilotage, mooring master services, and POAC services.',
        path: '/services',
        ogImage: 'https://www.ddsmarine.com/assets/sts-operation.jpg'
    });
});

app.get('/partners', (req, res) => {
    res.render('partners', { 
        title: 'Partners | DDS Marine Global Network',
        description: 'DDS Marine collaborates with industry leaders like Petronas, Shell, and Swire Shipping to deliver top-tier marine and energy trading solutions.',
        path: '/partners'
    });
});

app.get('/projects', (req, res) => {
    res.render('projects', { 
        title: 'Projects & Operations | DDS Marine',
        description: 'Explore our portfolio of successful marine operations, vessel chartering, and strategic advisory projects across the globe.',
        path: '/projects'
    });
});

app.get('/team', (req, res) => {
    res.render('team', { 
        title: 'Team | Capt. Dinesh & DDS Marine Leadership',
        description: 'Meet the experienced leadership team behind DDS Marine, led by Managing Director Capt. Dinesh.',
        path: '/team'
    });
});

app.get('/contact', (req, res) => {
    res.render('contact', { 
        title: 'Contact Us | DDS Marine Energy Services',
        description: 'Get in touch with DDS Marine for your maritime operations, advisory, and commercial inquiries at our Penang headquarters.',
        path: '/contact'
    });
});

app.get('/thankyou', (req, res) => {
    res.render('thankyou', { 
        title: 'Message Received | DDS Marine',
        description: 'Thank you for contacting DDS Marine Energy Services. We will get back to you shortly.',
        path: '/thankyou'
    });
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
    res.status(404).render('404', { 
        title: 'Page Not Found | DDS Marine',
        description: 'The page you are looking for does not exist.',
        path: req.path
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
