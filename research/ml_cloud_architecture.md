\# RF Spectrum Anomaly Hunter



\## ML Layer \& Cloud Inference Architecture Research



Author: Basudev Haldar\\

Repository: RF Spectrum Anomaly Hunter\\

Date: 10-03-2026



------------------------------------------------------------------------



\# 1. Research Objective



The objective of this research is to design a \*\*Machine Learning (ML)

architecture capable of detecting anomalies in RF spectrum data using an

unsupervised learning approach\*\*.



The RF Spectrum Anomaly Hunter system aims to monitor wireless

environments and identify abnormal signals such as:



\-   Rogue transmitters

\-   RF jamming attacks

\-   Unexpected interference

\-   Unauthorized spectrum usage



Traditional RF monitoring systems rely on rule-based detection methods

which cannot detect \*\*unknown or zero-day RF anomalies\*\*.



To overcome this limitation, the proposed system uses an

\*\*Autoencoder-based anomaly detection model\*\* that learns patterns of

\*\*normal RF spectrum behavior\*\* and detects deviations from that

baseline.



The research focuses on the following questions:



1\.  How RF data should be transformed into ML-compatible input.

2\.  What type of autoencoder architecture is most suitable.

3\.  How anomaly detection should be performed using reconstruction

&nbsp;   error.

4\.  How edge devices communicate with the cloud ML system.

5\.  What GPU resources are required for training and inference.



------------------------------------------------------------------------



\# 2. System Overview



The RF Spectrum Anomaly Hunter follows an \*\*Edge-Cloud Hybrid

Architecture\*\*.



The system is divided into three main components:



1\.  RF Data Acquisition Layer

2\.  Edge Processing Layer

3\.  Cloud Machine Learning Layer



System pipeline:



RTL-SDR Device\\

↓\\

RF Signal Capture\\

↓\\

FFT Processing\\

↓\\

Spectrogram Generation\\

↓\\

Feature Compression (Encoder)\\

↓\\

MQTT Transmission\\

↓\\

Cloud ML Inference\\

↓\\

Reconstruction Error\\

↓\\

Anomaly Detection\\

↓\\

Grad-CAM Explainability\\

↓\\

Alert \& Visualization



------------------------------------------------------------------------



\# 3. RF Data Processing Pipeline



Before machine learning can be applied, raw RF signals must be converted

into a suitable representation.



\## 3.1 RF Signal Acquisition



RF signals are captured using a \*\*Software Defined Radio (SDR)\*\* device

such as:



\-   RTL-SDR

\-   Nooelec SDR



The SDR captures \*\*complex baseband samples\*\*, called \*\*I/Q samples\*\*.



Each sample consists of:



x(t) = I(t) + jQ(t)



Where:



\-   I = In-phase component\\

\-   Q = Quadrature component\\

\-   j = imaginary unit



These samples contain the complete representation of the radio signal.



Example I/Q data:



0.21 + 0.34j\\

-0.12 + 0.67j\\

0.09 + 0.11j



------------------------------------------------------------------------



\## 3.2 Fast Fourier Transform (FFT)



Machine learning models perform better when RF signals are represented

in the \*\*frequency domain\*\*.



The Fast Fourier Transform converts time-domain samples into frequency

components.



Mathematical form:



X(k) = Σ x(n) e\\^(-j2πkn/N)



Where:



\-   x(n) = time domain signal

\-   X(k) = frequency domain representation



FFT allows us to determine:



\-   signal frequencies

\-   signal power

\-   interference patterns



------------------------------------------------------------------------



\## 3.3 Spectrogram Generation



A \*\*spectrogram\*\* is created by applying FFT repeatedly across time

windows.



Spectrogram axes:



&nbsp; Axis     Meaning

&nbsp; -------- --------------

&nbsp; X-axis   Time

&nbsp; Y-axis   Frequency

&nbsp; Color    Signal Power



Example spectrogram size:



128 × 128



This means:



\-   128 time slices

\-   128 frequency bins



Spectrograms transform RF signals into \*\*image-like data\*\*, which is

ideal for deep learning.



------------------------------------------------------------------------



\# 4. Machine Learning Layer



The ML layer is responsible for detecting anomalies in RF signals.



The selected method is a \*\*Convolutional Autoencoder (CAE)\*\*.



Autoencoders are neural networks designed to \*\*reconstruct their input

data\*\*.



They consist of two parts:



Encoder → Latent Space → Decoder



------------------------------------------------------------------------



\# 5. Autoencoder Architecture



\## 5.1 Encoder



The encoder compresses the spectrogram into a low-dimensional

representation.



Input:



128 × 128 spectrogram



Encoder pipeline:



Input Spectrogram\\

↓\\

Conv2D Layer\\

↓\\

ReLU Activation\\

↓\\

MaxPooling\\

↓\\

Conv2D Layer\\

↓\\

Flatten\\

↓\\

Dense Layer



Output:



Latent Vector (32 dimensions)



The latent vector represents the \*\*essential characteristics of the RF

signal\*\*.



------------------------------------------------------------------------



\## 5.2 Latent Space



The latent space is a compressed representation of the spectrogram.



Example:



16384 input values → 32 latent features



The model learns to store only the \*\*most important spectral features\*\*.



------------------------------------------------------------------------



\## 5.3 Decoder



The decoder reconstructs the original spectrogram from the latent

vector.



Pipeline:



Latent Vector\\

↓\\

Dense Layer\\

↓\\

Reshape\\

↓\\

ConvTranspose Layer\\

↓\\

Upsampling\\

↓\\

Output Spectrogram



The reconstructed spectrogram should closely match the original input.



------------------------------------------------------------------------



\# 6. Anomaly Detection Mechanism



The autoencoder is trained using \*\*only normal RF data\*\*.



During training, the model learns to reconstruct normal signals

accurately.



When the system encounters abnormal RF signals, the reconstruction

becomes inaccurate.



Anomaly detection is performed using \*\*Reconstruction Error\*\*.



Formula:



Reconstruction Error = MSE(Input, Reconstruction)



Where MSE is Mean Squared Error.



MSE = (1/N) Σ (x − x̂)²



If reconstruction error exceeds a threshold, the signal is classified as

an anomaly.



------------------------------------------------------------------------



\# 7. Threshold Determination



To determine anomaly thresholds, the model is evaluated on normal

validation data.



Steps:



1\.  Calculate reconstruction error for each normal sample.

2\.  Compute statistical parameters.



μ = mean error\\

σ = standard deviation



Threshold formula:



threshold = μ + 3σ



If:



error \\> threshold



Then:



RF anomaly detected



------------------------------------------------------------------------



\# 8. MQTT Communication Layer



The system uses \*\*MQTT (Message Queuing Telemetry Transport)\*\* for

communication between the edge device and cloud.



MQTT is a lightweight messaging protocol suitable for IoT systems.



Advantages:



\-   low bandwidth usage

\-   publish-subscribe architecture

\-   real-time messaging



Communication pipeline:



Edge Device\\

↓\\

MQTT Publisher\\

↓\\

MQTT Broker\\

↓\\

Cloud Subscriber\\

↓\\

ML Inference Service



Data transmitted:



timestamp\\

center frequency\\

spectrogram metadata\\

latent vector\\

device ID



------------------------------------------------------------------------



\# 9. Cloud Inference Architecture



The cloud layer performs ML inference and anomaly detection.



Components:



&nbsp; Component           Description

&nbsp; ------------------- ----------------------------------

&nbsp; Inference API       Receives data from MQTT

&nbsp; Autoencoder Model   Performs reconstruction

&nbsp; Error Calculator    Computes anomaly score

&nbsp; Grad-CAM Module     Generates explainability heatmap

&nbsp; Alert Engine        Sends notifications

&nbsp; Database            Stores RF logs



Inference pipeline:



MQTT message received\\

↓\\

Feature decoding\\

↓\\

Autoencoder reconstruction\\

↓\\

Error calculation\\

↓\\

Anomaly classification\\

↓\\

Heatmap generation\\

↓\\

Alert generation



------------------------------------------------------------------------



\# 10. GPU Requirements



Deep learning training requires GPU acceleration.



Recommended GPU configurations:



&nbsp; GPU         VRAM    Usage

&nbsp; ----------- ------- -----------------

&nbsp; NVIDIA T4   16 GB   Cloud inference

&nbsp; RTX 3060    12 GB   Model training

&nbsp; RTX 3090    24 GB   Large datasets



GPU acceleration is required for:



\-   model training

\-   hyperparameter tuning

\-   large dataset processing



Inference can run on CPU if latency requirements are low.



------------------------------------------------------------------------



\# 11. Explainability Layer (Grad-CAM)



Deep learning models are often considered "black boxes".



To make anomaly detection interpretable, the system uses \*\*Grad-CAM

(Gradient-weighted Class Activation Mapping)\*\*.



Grad-CAM produces heatmaps showing which regions of the spectrogram

contributed to the anomaly.



Heatmap interpretation:



&nbsp; Color   Meaning

&nbsp; ------- ---------------------------

&nbsp; Red     High anomaly contribution

&nbsp; Blue    Normal signal



This allows analysts to identify:



\-   exact frequency of interference

\-   time of anomaly

\-   signal pattern causing anomaly



------------------------------------------------------------------------



\# 12. Implementation Technology Stack



Recommended technologies for the project:



&nbsp; Component            Technology

&nbsp; -------------------- ----------------

&nbsp; RF Capture           RTL-SDR

&nbsp; Signal Processing    Python + SciPy

&nbsp; Machine Learning     PyTorch

&nbsp; Edge Device          Orange Pi

&nbsp; Messaging Protocol   MQTT

&nbsp; Cloud API            FastAPI

&nbsp; Visualization        Streamlit

&nbsp; Database             PostgreSQL



------------------------------------------------------------------------



\# 13. Key Insights



Important conclusions from the research:



1\.  Unsupervised learning is necessary to detect unknown RF anomalies.

2\.  Spectrograms provide an effective representation of RF signals for

&nbsp;   deep learning.

3\.  Convolutional Autoencoders can learn RF patterns efficiently.

4\.  Edge-cloud architecture reduces bandwidth requirements.

5\.  MQTT enables scalable communication between RF sensors and the ML

&nbsp;   system.

6\.  Grad-CAM provides interpretability for anomaly detection results.



------------------------------------------------------------------------



\# 14. References



1\.  O'Shea, T., \& Hoydis, J. (2017). Deep Learning for the Physical

&nbsp;   Layer.\\

2\.  Jian et al. (2020). Deep Learning for RF Fingerprinting.\\

3\.  Tschimben \& Gifford (2022). LSTM Autoencoders for Spectrum

&nbsp;   Monitoring.\\

4\.  Selvaraju et al. (2017). Grad-CAM: Visual Explanations from Deep

&nbsp;   Networks.



------------------------------------------------------------------------



