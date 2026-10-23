# MongoDB Atlas Vector Search Setup Guide (Phase 3)

This guide walks you through creating the Atlas Vector Search Index for the **AI Research Assistant** in the MongoDB Atlas Web Console.

---

## 1. Locate Your Cluster & Collection

1. Open [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left navigation bar, click on **Database** (or **Atlas Search** / **Vector Search**).
3. Find your cluster (e.g. `ai-research-cluster`).
4. Click the **Search Indexes** tab (or **Atlas Search** tab).

---

## 2. Create the Vector Search Index

1. Click **Create Search Index**.
2. Under **Atlas Vector Search**, choose **JSON Editor**.
3. Click **Next**.
4. Configure the index details:
   - **Database**: Select your database (e.g. `test` or your configured database name).
   - **Collection**: Select `chunks`.
   - **Index Name**: Enter `vector_index` *(exact match required)*.
5. In the JSON editor, paste the following definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "paperId"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

### Why this configuration?
* **`numDimensions: 1536`**: Matches OpenAI `text-embedding-3-small` vector output dimensions.
* **`similarity: "cosine"`**: Normalized angular similarity, ideal for semantic text search.
* **`filter: "paperId"`**: Allows filtering search to a single paper (used in Phase 5: Single-Paper RAG Chat).
* **`filter: "userId"`**: Allows filtering search across a user's entire library without leaking other users' data (used in Phase 6: Cross-Library RAG Chat).

6. Click **Next** and then **Create Search Index**.
7. Wait 1–2 minutes for the status badge to switch from `Building` to `Active`.

---

## 3. Verify in Backend

Once the index is active in Atlas, you can test it directly with our test script:

```bash
cd server
node scripts/testVectorSearch.js
```

When Atlas has finished building the index, the query method in `testVectorSearch.js` and in the API will automatically use `atlas-vectorSearch`!

---

## 4. API Endpoints for Vector Search

* **Inspect Chunks**:
  ```http
  GET /api/papers/:id/chunks
  Authorization: Bearer <token>
  ```

* **Reprocess Paper (Re-chunk and Re-embed)**:
  ```http
  POST /api/papers/:id/reprocess
  Authorization: Bearer <token>
  ```

* **Vector Search Query**:
  ```http
  POST /api/papers/:id/search
  Authorization: Bearer <token>
  Content-Type: application/json

  {
    "query": "neural networks and consciousness",
    "limit": 5
  }
  ```
