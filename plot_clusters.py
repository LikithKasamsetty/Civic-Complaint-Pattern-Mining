import json
import matplotlib.pyplot as plt
import pandas as pd
import os

with open('outputs/results.json') as f:
    data = json.load(f)

df = pd.DataFrame(data['scatter'])

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
fig.suptitle('PCA vs t-SNE: Dimensionality Reduction Comparison', fontsize=16)

# PCA
sc1 = ax1.scatter(df['pca_x'], df['pca_y'], c=df['kmeans_label'], cmap='tab10', alpha=0.7, s=50)
ax1.set_title('PCA Visualization', fontsize=14, fontweight='bold')
ax1.set_xlabel('Principal Component 1', fontsize=12)
ax1.set_ylabel('Principal Component 2', fontsize=12)
ax1.grid(True, alpha=0.3)
cbar1 = plt.colorbar(sc1, ax=ax1)
cbar1.set_label('Cluster')

# t-SNE
sc2 = ax2.scatter(df['tsne_x'], df['tsne_y'], c=df['kmeans_label'], cmap='tab10', alpha=0.7, s=50)
ax2.set_title('t-SNE Visualization', fontsize=14, fontweight='bold')
ax2.set_xlabel('t-SNE Component 1', fontsize=12)
ax2.set_ylabel('t-SNE Component 2', fontsize=12)
ax2.grid(True, alpha=0.3)
cbar2 = plt.colorbar(sc2, ax=ax2)
cbar2.set_label('Cluster')

plt.tight_layout()
plt.savefig('outputs/cluster_comparison.png', dpi=300)
print("Saved outputs/cluster_comparison.png")
