const natural = require("natural");
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

function createContentHash(content) {
    return content.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0).toString(16);
}

function preprocessText(text) {
    return tokenizer.tokenize(text)
        .map(t => t.toLowerCase())
        .filter(t => !natural.stopwords.includes(t))
        .join(' ');
}

// ✅ Compute Cosine Similarity between two term vectors
function calculateCosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    vecA.forEach(termA => {
        let termB = vecB.find(term => term.term === termA.term);
        if (termB) {
            dotProduct += termA.tfidf * termB.tfidf;
        }
        normA += Math.pow(termA.tfidf, 2);
    });

    vecB.forEach(termB => {
        normB += Math.pow(termB.tfidf, 2);
    });

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ✅ Compare new document against existing ones
function advancedDocumentMatching(newDoc, existingDocs) {
    const tfidf = new TfIdf();
    const documentVectors = {};

    existingDocs.forEach(doc => {
        tfidf.addDocument(preprocessText(doc.content));
        documentVectors[doc.id] = tfidf.listTerms(tfidf.documents.length - 1);
    });

    tfidf.addDocument(preprocessText(newDoc));
    const newDocTerms = tfidf.listTerms(tfidf.documents.length - 1);
    const matches = [];

    existingDocs.forEach(doc => {
        const similarity = calculateCosineSimilarity(newDocTerms, documentVectors[doc.id]);
        if (similarity > 0.6) { // Threshold for matching
            matches.push({ doc, similarity });
        }
    });

    return matches.sort((a, b) => b.similarity - a.similarity);
}

module.exports = { createContentHash, advancedDocumentMatching, preprocessText };
