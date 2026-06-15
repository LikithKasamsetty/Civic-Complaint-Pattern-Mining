# Civic Complaint Pattern Mining

This project is a full-stack application that uses Machine Learning to analyze and cluster civic complaints, identifying key patterns and detecting anomalous or highly urgent complaints that require immediate attention.

## Model Evaluation & Metrics (Why is there no "Accuracy"?)

Because this project relies entirely on **Unsupervised Machine Learning**, traditional metrics like **Accuracy** do not apply. "Accuracy" is a supervised learning metric that requires labeled data (knowing the "correct" answer beforehand) to compare against predictions. 

Instead, the models in this project are evaluated based on how well they group similar data and identify outliers. The following metrics are used:

1. **Clustering Quality (K-Means)**
   - **Silhouette Score**: Measures how similar an object is to its own cluster compared to other clusters. A higher score means complaints are grouped clearly and distinctly.
   - **Davies-Bouldin Score**: Evaluates the average similarity between clusters. A lower score indicates better separation.
   - **Elbow Method**: Used to determine the optimal number of clusters by minimizing inertia.

2. **Anomaly Detection (Isolation Forest & Local Outlier Factor)**
   - **Contamination Rate**: Since we don't have labeled anomalies (we don't know beforehand which complaints are outliers), we set a contamination rate (e.g., 5%) to flag the most statistically unusual complaints based on their textual features and urgency scores.

3. **Dimensionality Reduction (PCA & t-SNE)**
   - **Explained Variance**: Used to ensure that the reduced 2D representation retains the maximum possible information from the high-dimensional text features (TF-IDF).

## How to Run

### Install dependencies
pip install -r requirements.txt

### Start the backend
python run_server.py

### Start the Frontend
npm run dev

**Where is this located in the code?**
These metrics are calculated dynamically during the data processing stage in the backend. You can find the exact implementation in:
- `backend/pipeline.py` (Around Lines 64-67), where `silhouette_score` and `davies_bouldin_score` are imported and computed.
- The metrics are then exported in the final `results.json` to be displayed on the frontend dashboard.
