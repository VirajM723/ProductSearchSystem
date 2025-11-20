# Product Search System – MEAN-Stack E-Commerce Platform with Elasticsearch

A full-stack MEAN web application designed to function as an efficient e-commerce platform that enables users to browse, search, and explore products in real time. Powered by Elasticsearch for high-performance search, the system supports full CRUD operations on the backend and delivers a rich and responsive user experience on the frontend.

## 1) Features

### Product Browsing
- View all available products through the storefront interface
- Access detailed product pages including category, price, description, and more

### Smart Product Search (Elasticsearch)
- High-speed search of products by name, category, description, or tags
- Supports fuzzy search for partial matches and spelling variations
- Ranked and relevance-based search result ordering

### Product Management (Backend / Admin)
- Create, read, update, and delete products (CRUD)
- Automatic Elasticsearch index updates on every modification
- Optimized indexing for large product catalogs

### Modern UI & UX
- Dynamic and responsive Angular frontend
- Client-side routing for seamless navigation
- Mobile-friendly interface

### API-Driven Architecture
- REST API developed using Node.js and Express
- Mongoose ORM for database operations and schema definition
- Consistent JSON-based request and response structure

## 2) Tech Stack

**Frontend**
- Angular
- TypeScript
- HTML5, CSS3
- RxJS
- Angular Router

**Backend**
- Node.js
- Express.js
- Mongoose ORM

**Database**
- MongoDB
- MongoDB Atlas / Compass for database management

**Search Engine**
- Elasticsearch (Product indexing & high-speed querying)
- Kibana (optional — monitoring and visualization)

## 3) Project Structure

```
Product-Search-System/
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── product.model.js
│   │   ├── routes/
│   │   │   └── product.routes.js
│   │   ├── controllers/
│   │   │   └── product.controller.js
│   │   ├── config/
│   │   │   ├── database.js
│   │   │   └── elastic.config.js
│   │   ├── app.js
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── components/
    │   │   ├── pages/
    │   │   ├── services/
    │   │   ├── app.component.ts
    │   │   └── app.module.ts
    │   └── main.ts
    ├── angular.json
    └── package.json
```

## 4) API Endpoints

| Endpoint | Method | Description |
|---------|--------|-------------|
| /api/products/ | GET | Fetch all products |
| /api/products/:id | GET | Fetch details of a single product |
| /api/products/ | POST | Add a new product |
| /api/products/:id | PUT / PATCH | Update an existing product |
| /api/products/:id | DELETE | Delete a product |
| /api/products/search/:query | GET | Search products with Elasticsearch |

## 5) How It Works

1. Admin adds or updates products from the backend.
2. MongoDB stores the product documents.
3. Elasticsearch indexes product documents for fast retrieval.
4. Angular frontend communicates with the backend via REST API.
5. Search results and product lists are displayed dynamically via Angular components.

## 6) Key Challenges Solved

- Effective integration of MongoDB CRUD operations with Elasticsearch indexing
- Maintenance of real-time synchronization between database and search index
- Implementation of scalable and performant search logic for large product inventories
- Development of a clean, maintainable MEAN-stack codebase
- Delivery of a fast and intuitive user search experience with relevance ranking

## Conclusion

Product Search System presents a scalable and production-ready e-commerce architecture powered by the MEAN stack and Elasticsearch. Combining a responsive Angular interface with high-speed search and modular backend architecture, it serves as a strong foundation for real-world commercial deployments as well as academic and portfolio demonstration.
