# ML Layer and Cloud Inference Architecture

RF Spectrum Anomaly Hunter

Author: Basudev Haldar\
Issue Reference: #6

------------------------------------------------------------------------

## 1. Research Objective

The objective of this document is to describe the design and
implementation of the Machine Learning layer and the cloud inference
architecture used in the RF Spectrum Anomaly Hunter system.

The system focuses on detecting anomalous transmissions in the 433 MHz
ISM radio band using an unsupervised deep learning model. Instead of
relying on labeled attack datasets, the proposed system uses a
Convolutional Autoencoder trained only on normal RF transmissions.

The ML layer performs three primary tasks:

• Learn baseline RF behaviour of authorized devices\
• Reconstruct incoming RF spectrograms using the trained model\
• Detect anomalies by measuring reconstruction error

This approach allows the system to identify unknown or zero‑day RF
transmissions without prior attack signatures.

------------------------------------------------------------------------

## 2. Complete System Architecture

The RF Spectrum Anomaly Hunter system follows a hybrid edge‑cloud
architecture designed to minimize bandwidth consumption while
maintaining accurate anomaly detection.

``` mermaid
flowchart TD

A[RF Environment<br>433 MHz Devices] --> B[RTL-SDR Receiver]

B --> C[Edge Device<br>Raspberry Pi Zero 2W]

C --> D[Signal Processing<br>FFT and Spectrogram Generation]

D --> E[Feature Extraction]

E --> F[MQTT Publisher]

F --> G[MQTT Broker<br>HiveMQ Cloud]

G --> H[Cloud Inference Service<br>FastAPI]

H --> I[Autoencoder Model]

I --> J[Reconstruction Error Calculation]

J --> K{Anomaly Detection}

K -->|Normal| L[Store Baseline Metrics]

K -->|Anomaly| M[Generate Alert]

M --> N[Monitoring Dashboard]

M --> O[Edge Alert System]
```

------------------------------------------------------------------------

## 3. Post‑MQTT Inference Architecture

Once the edge device transmits spectrogram features through MQTT, the
cloud inference layer processes the data.

``` mermaid
flowchart TD

A[Edge Device<br>Raspberry Pi + RTL‑SDR] --> B[MQTT Broker<br>HiveMQ Cloud]

B --> C[Cloud Subscriber<br>FastAPI Service]

C --> D[Data Preprocessing<br>Spectrogram Normalization]

D --> E[Autoencoder Model<br>PyTorch Inference]

E --> F[Reconstruction Error<br>MSE Calculation]

F --> G{Threshold Check<br>μ + 3σ}

G -->|Normal| H[Store Baseline Metrics]

G -->|Anomaly| I[Generate Alert]

I --> J[Dashboard Visualization]

I --> K[Edge Alert System]
```

------------------------------------------------------------------------

## 4. RF Spectrogram Representation

The raw RF signal captured by the RTL‑SDR is transformed into a
spectrogram before being processed by the neural network.

Spectrogram characteristics:

Frequency bins: 1024\
Time windows: 64\
Channels: 1 (grayscale)

A spectrogram represents the time‑frequency distribution of signal
energy and allows RF signals to be processed using convolutional neural
networks similar to image data.

------------------------------------------------------------------------

## 5. Autoencoder Model Architecture

The anomaly detection model is implemented as a Convolutional
Autoencoder.

Autoencoders learn a compressed representation of the input data and
attempt to reconstruct the original signal from this compressed
representation.

Model structure:

Encoder → Latent Space → Decoder

Input: RF spectrogram (1024 × 64)\
Output: reconstructed spectrogram

``` mermaid
flowchart TD

A[Input Spectrogram<br>1024 × 64]

A --> B[Conv2D Layer<br>1 → 32]

B --> C[ReLU Activation + MaxPool]

C --> D[Conv2D Layer<br>32 → 64]

D --> E[ReLU Activation + MaxPool]

E --> F[Conv2D Layer<br>64 → 128]

F --> G[ReLU Activation + MaxPool]

G --> H[Flatten Layer]

H --> I[Dense Layer<br>Latent Vector<br>64 Features]

I --> J[Dense Expansion]

J --> K[Reshape Layer]

K --> L[ConvTranspose2D<br>128 → 64]

L --> M[Upsample]

M --> N[ConvTranspose2D<br>64 → 32]

N --> O[Upsample]

O --> P[ConvTranspose2D<br>32 → 1]

P --> Q[Reconstructed Spectrogram<br>1024 × 64]
```

------------------------------------------------------------------------

## 6. Latent Space Representation

The latent vector represents a compressed RF fingerprint extracted from
the spectrogram.

Input size:

1024 × 64 = 65,536 values

Latent vector:

64 values

This results in approximately 1000× compression, forcing the model to
learn only the most meaningful spectral characteristics.

------------------------------------------------------------------------

## 7. Mathematical Formulation

Let X represent the input spectrogram and X̂ represent the reconstructed
spectrogram produced by the autoencoder.

The model learns a function:

f(X) = X̂

The reconstruction error is computed using Mean Squared Error.

MSE(X, X̂) = (1/N) Σ (Xi − X̂i)²

If the reconstruction error exceeds the anomaly threshold, the signal is
considered anomalous.

------------------------------------------------------------------------

## 8. Threshold Determination

The anomaly threshold is determined using statistical properties of
reconstruction error obtained during training.

Let μ represent the mean reconstruction error and σ represent the
standard deviation.

Threshold:

μ + 3σ

Decision rule:

If reconstruction error \> threshold → anomaly detected

------------------------------------------------------------------------

## 9. Training Methodology

The model is trained using only normal RF transmissions from authorized
devices.

Training dataset:

10,000 spectrogram samples

Training environment:

Google Colab with Tesla T4 GPU

Framework:

PyTorch

Training parameters:

Epochs: 50\
Batch size: 32\
Optimizer: Adam\
Learning rate: 0.001

------------------------------------------------------------------------

## 10. Dataset Collection Methodology

Baseline RF signals are collected from multiple authorized devices
operating in the 433 MHz ISM band.

Devices used:

LoRa SX1278 module\
433 MHz wireless doorbell\
RC transmitter\
Car remote controller

Collection environments:

Indoor environment\
Outdoor environment\
High interference environment

Each device is operated for approximately one hour, capturing
spectrogram samples once per second.

------------------------------------------------------------------------

## 11. Inference Pipeline

During runtime the cloud inference system performs the following
operations:

1.  Subscribe to MQTT topic
2.  Receive spectrogram data
3.  Normalize input tensor
4.  Perform autoencoder inference
5.  Compute reconstruction error
6.  Compare with anomaly threshold
7.  Generate alerts for abnormal signals

Target inference latency: less than 150 milliseconds.

------------------------------------------------------------------------

## 12. Latency Breakdown

  Processing Stage                 Latency
  -------------------------------- ---------
  RF Capture                       5 ms
  FFT and Spectrogram Generation   768 ms
  Feature Compression              20 ms
  MQTT Transmission                120 ms
  Cloud Preprocessing              30 ms
  ML Inference                     150 ms
  Alert Routing                    40 ms
  Dashboard Update                 50 ms

Total system latency ≈ 1.3 seconds.

------------------------------------------------------------------------

## 13. Explainability Layer

To improve interpretability of anomaly detection results, Grad‑CAM is
applied to generate visual heatmaps.

Grad‑CAM highlights the regions of the spectrogram that contributed most
strongly to the anomaly detection decision.

This allows analysts to identify:

Suspicious frequency bands\
Temporal bursts of interference\
Unexpected transmission patterns

------------------------------------------------------------------------

## 14. Key Insights

Unsupervised learning removes the need for labeled RF attack datasets.\
Spectrogram‑based representations allow RF signals to be analyzed using
convolutional neural networks.\
Reconstruction error provides a reliable indicator of anomalous RF
behaviour.\
Hybrid edge‑cloud architectures reduce bandwidth usage while maintaining
detection performance.

------------------------------------------------------------------------

## 15. Limitations

Model performance depends on the diversity of baseline training data.\
The current implementation focuses only on the 433 MHz band.\
Highly dynamic RF environments may require adaptive threshold tuning.

------------------------------------------------------------------------

## 16. Future Work

Future improvements may include:

Multi‑band RF anomaly detection\
Online learning for dynamic RF environments\
Model optimization for ultra‑low power edge devices\
Federated anomaly detection across distributed sensors

------------------------------------------------------------------------

## 17. References

O'Shea, T., and Hoydis, J. Deep Learning for the Physical Layer

Jian, X. et al. Deep Learning for RF Fingerprinting

Selvaraju, R. et al. Grad‑CAM: Visual Explanations from Deep Networks
