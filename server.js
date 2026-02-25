const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    const url = req.url;
    const method = req.method;

    console.log(` Request: ${method} ${url}`);

    // ================ 1️ HEALTH CHECK ROUTE ================
    if (url === '/health' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'OK',
            message: 'Server is running',
            time: new Date().toISOString()
        }));
    }

    // ================ 2️ GET ALL PRODUCTS ================
    else if (url === '/products' && method === 'GET') {
        // Read products from file
        fs.readFile('./data/products.json', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Could not read products' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(data);
        });
    }

    // ================ 3️ GET SINGLE PRODUCT BY ID ================
    else if (url.startsWith('/products/') && method === 'GET') {
        const id = url.split('/')[2]; // Get ID from URL like /products/1

        fs.readFile('./data/products.json', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Could not read products' }));
                return;
            }

            const products = JSON.parse(data);
            const product = products.find(p => p.id === id);

            if (product) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(product));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Product not found' }));
            }
        });
    }

    // ================ 4️ CREATE NEW PRODUCT (POST) ================
    else if (url === '/products' && method === 'POST') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const newProduct = JSON.parse(body);

                // Check if all fields are provided
                if (!newProduct.name || !newProduct.price || !newProduct.description || !newProduct.category) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Please provide name, price, description, and category' }));
                    return;
                }

                // Read existing products
                fs.readFile('./data/products.json', 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Could not read products' }));
                        return;
                    }

                    const products = JSON.parse(data);

                    // Generate new ID
                    const newId = products.length > 0 ? String(products.length + 1) : '1';
                    newProduct.id = newId;
                    newProduct.price = parseFloat(newProduct.price);

                    // Add to array
                    products.push(newProduct);

                    // Save to file
                    fs.writeFile('./data/products.json', JSON.stringify(products, null, 2), (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Could not save product' }));
                            return;
                        }

                        res.writeHead(201, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(newProduct));
                    });
                });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    // ================ 5️ UPDATE PRODUCT (PUT) ================
    else if (url.startsWith('/products/') && method === 'PUT') {
        const id = url.split('/')[2];
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const updates = JSON.parse(body);

                fs.readFile('./data/products.json', 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Could not read products' }));
                        return;
                    }

                    const products = JSON.parse(data);
                    const index = products.findIndex(p => p.id === id);

                    if (index === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Product not found' }));
                        return;
                    }

                    // Update product (keep the same ID)
                    products[index] = {
                        ...products[index],
                        ...updates,
                        id: products[index].id,
                        price: updates.price ? parseFloat(updates.price) : products[index].price
                    };

                    // Save to file
                    fs.writeFile('./data/products.json', JSON.stringify(products, null, 2), (err) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Could not save product' }));
                            return;
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(products[index]));
                    });
                });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }

    // ================ 6️ DELETE PRODUCT ================
    else if (url.startsWith('/products/') && method === 'DELETE') {
        const id = url.split('/')[2];

        fs.readFile('./data/products.json', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Could not read products' }));
                return;
            }

            const products = JSON.parse(data);
            const index = products.findIndex(p => p.id === id);

            if (index === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Product not found' }));
                return;
            }

            // Remove product
            const deletedProduct = products.splice(index, 1)[0];

            // Save to file
            fs.writeFile('./data/products.json', JSON.stringify(products, null, 2), (err) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Could not save products' }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    message: 'Product deleted successfully',
                    product: deletedProduct
                }));
            });
        });
    }

    // ================ HOME PAGE ================
    else if (url === '/' && method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
        <html>
            <head><title>Home Page</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1> Welcome to My Store!</h1>
                <p>Go to <a href="/products">/products</a> to see all products</p>
                <p>Go to <a href="/health">/health</a> to check server status</p>
                
                <h2> Available Routes:</h2>
                <ul style="list-style: none; padding: 0;">
                    <li> <a href="/health">GET /health</a> - Check server status</li>
                    <li> <a href="/products">GET /products</a> - Get all products</li>
                    <li> <a href="/products/1">GET /products/1</a> - Get product with ID 1</li>
                    <li> POST /products - Create new product (use curl or Postman)</li>
                    <li> PUT /products/1 - Update product with ID 1 (use curl or Postman)</li>
                    <li> DELETE /products/1 - Delete product with ID 1 (use curl or Postman)</li>
                </ul>
                
            </body>
        </html>
    `);
    }

    // ================ 404 NOT FOUND ================
    else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1> 404 - Page Not Found</h1>
                    <a href="/">Go back to Home</a>
                </body>
            </html>
        `);
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(` Server is running!`);
    console.log(` Address: http://localhost:${PORT}`);
    console.log(`\n All routes are ready:`);
    console.log(`   1️ GET    /health`);
    console.log(`   2️ GET    /products`);
    console.log(`   3️ GET    /products/:id`);
    console.log(`   4️ POST   /products`);
    console.log(`   5️ PUT    /products/:id`);
    console.log(`   6️ DELETE /products/:id`);
});