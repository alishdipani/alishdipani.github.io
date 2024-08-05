---
layout: post
title: Neural Style Transfer on Audio Signals
date: 2018-08-29 12:00:00
permalink: projects/2018/08/Neural-Style-Transfer-Audio/
tags: style-transfer, audio-processing
---

Summary: Generation of new music using Neural Style Transfer Algorithm.  

# <ins>Introduction</ins>

"Style Transfer" on images has recently become very popular and an active research topic, this shows how Convolutional Neural Networks(CNNs) have the power to adapt to a great variety of tasks. Here, we extend and modify this algorithm for audio signals and use the power of CNNs and generate new audio from a style audio that can be the tune or the beat and a content audio that can be someone just speaking the lyrics of a song. 

# <ins>Neural Style Transfer on Images</ins>

"Neural Style Transfer" was originally for images, the idea is to use a CNN model for extracting the style of an image called style image and content of another image called content image and generating a new image having the style of the style image and content of the content image. This is done by encoding the two images using a CNN Model and then taking a white noise image and minimizing the loss between this image and content and style images so that it has the content same as the content image and style as style image. <br><br>
Let $$ \vec{p} $$ be the content image,  $$ \vec{a} $$ be the style image and $$ \vec{x} $$ be the white noise image (i.e. the generated image) which will be the final image.  
So, total loss is sum of content loss and style loss.  
$$ L_{total}(\vec{p},\vec{a},\vec{x}) = \alpha L_{content}(\vec{p},\vec{x}) + \beta L_{style}(\vec{a},\vec{x})$$

### CNN Model

A deep CNN model is chosen to extract the features of images. Deep CNN models provide proper encoding for the features of images. A Model like VGG-19 is chosen having a large number of convolutional layers. Pre-trained model is used as they provide proper encoding.

![alt text](https://www.pyimagesearch.com/wp-content/uploads/2018/08/neural_style_transfer_gatys.jpg)

### Content Loss

The content loss is the Mean squared error between the encoding of the white noise image and the content image.  
For a layer $$ l $$ and the input image $$ \vec{x} $$, let the number of filters be $$ N_{l} $$ and so the output(or encoded) image will have $$ N_{l} $$ feature maps, each of size $$ M_{l} $$, where $$ M_{l} $$ is the height times width. So, the encoded image of layer can be stored in a matrix $$ F_{l}  \epsilon  R^{ N_{l}xM_{l} } $$. Where $$ F^{l}_{ij} $$ is the activation of $$ i^{th} $$ filter at position $$ j $$ in layer $$ l $$.  
$$ L_{content}(\vec{p},\vec{x},l) = \frac{1}{2} \sum_{i,j}(F^{l}_{ij} - P^{l}_{ij})^{2}$$ 

### Style Loss 

For capturing the style a style representation is used which computer the correlations between the different filter responses, where the expectation is taken over the spatial extent of the input image. These feature correlations are given by Gram Matrix $$ G^{l} \epsilon R^{ N_{l}xN_{l} } $$, where $$ G^{l}_{ij} $$ is the inner product between the feature maps $$ i $$ and $$ j $$ represented by vectors in layer $$ l $$ and $$ N_{l} $$ is the number of feature maps.  
$$ G^{l}_{ij}= \sum_{k}F^{l}_{ik}F^{l}_{jk} $$.  
And so the Style loss is the Mean squared error between the gram matrices of Style image and the white noise image.  
Let $$ \vec{a} $$ be the style image and $$ \vec{x} $$ be the white noise image. Let $$ A^{l} $$ and $$ X^{l} $$ be the style representations of of style image and white noise image in layer $$ l $$. So, Total style loss of a layer $$ l $$ is $$ E_{l} $$.  
$$ E_{l} = \frac{\sum_{i,j}(X^{l}_{ij}-A^{l}_{ij})^{2}}{4N^{2}_{l}M^{2}_{l}} $$  
So, the total style is  
$$ L_{style}(\vec{a},\vec{x}) = \sum^{L}_{l=0}w_{l}E_{l} $$  
where $$ w_{l} $$ are the weighting factor of each layer.

### Hyperparameter tuning

To calculate the style and content loss, standard error back-propagation is done.
To calculate $$ L_{total} $$, $$ L_{content} $$ is weighted by $$ \alpha $$ and $$ L_{style} $$ is weighted by $$ \beta $$.  
The ratio of $$ \frac{\alpha}{\beta} $$ is generally kept $$ 10^{-3} $$ or $$ 10^{-4} $$, this prevents the style from dominating and therefore preventing the loss of content.

# <ins>Neural Style Transfer on Audio Signals</ins>

The base idea for Neural Style algorithm for audio signals is same as for images, the extracted style of the style audio is to be applied to the generated audio. Here, the content audio is directly used for generation instead of noise audio as this prevents calculation of content loss and eliminates the noise from the generated audio.

### Model Selection
For Audio signals 1 Dimensional Convolutions are used as they have different spatial features than images. So, models having 1-D CNN layers is used.  
It is observed that shallow models perform better than deep models and so a shallow model having only one layer but having large number of filters is used. The models are not pre-trained and have random weights as it is observed that it does not make a difference as we only need the encoding.

### Pre-processing
An audio signal has to be converted to frequency domain from time domain because the frequencies have the spatial features of audio signals. The raw audio is converted to spectrogram via Short Time Fourier Transform(STFT). Spectrogram is a 2D Representation of a 1D signal, Spectrogram has $$ C $$ channels and $$ S $$ samples for every channel. So, a spectrogram can be considered as an $$ 1xS $$ image with $$ C $$ channels.

![alt text](https://ai2-s2-public.s3.amazonaws.com/figures/2017-08-08/7c592e7e00422dc7a76ead5932e34eafb5bef704/2-Figure2-1.png)

### Content Loss

Here, as the content audio is used for generation of the new audio i.e. the generated audio, content loss is not taken into consideration. However, it can be taken into consideration.  
So, here total loss is just the style loss

### Style Loss

For style extraction, gram matrices are used same as in images. Gram Matrix $$ G \epsilon R^{ NxN } $$, where $$ G_{ij} $$ is the inner product between the feature maps $$ i $$ and $$ j $$ represented by vectors and $$ N $$ is the number feature maps. The difference here is that the feature maps here are 1- Dimensional whereas in images they are 2D. Also, as we are using a model with only one layer, there is no notation of $$ l $$. Let $$ F_{ij} $$ be the spectrogram i.e. the encoding of the audio of $$ i^{th} $$ filter at $$ j^{th} $$ position.  
$$ G_{ij}= \sum_{k}F_{ik}F_{jk} $$.  
Style loss is the Mean squared error between the gram matrices of Style audio and the generated audio i.e. content audio.  
Let $$ \vec{a} $$ be the style audio and $$ \vec{x} $$ be the generated audio. Let $$ A $$ and $$ X $$ be the style representations of of style audio and generated audio with $$ N $$ number of channels(or number of filters) and $$ M $$ number of samples. So, Total style loss  is $$ L(\vec{a},\vec{x})_{style} $$.  
$$ L(\vec{a},\vec{x})_{style} = \frac{\sum_{i,j}(X_{ij}-A_{ij})^{2}}{4N^{2}M^{2}} $$.  
Here, only one layer is present so there's no significance of weighting of layer.


### Post-processing
After generation of audio phase reconstruction is done so as to convert the audio back to time domain from frequency domain. Griffin-Lim algorithm is used for reconstruction.
Also, instead of using white noise to generate the final audio, the content audio is used which also prevents calculations as content loss is no longer needed, only style loss is used which is similar to images.

### Hyperparameter tuning

To calculate the style loss, standard error back-propagation is done.

<!---
# <ins>Implementation</ins>
--->

<!---
# <ins>Conclusion</ins>

Convolutional Neural Networks can be used for 

--->

# <ins>Future Work</ins>

With the coming of new generative models like Generative Adversarial Networks the neural style transfer algorithm can be modified and can be used for better results.

# <ins>Technology Overview</ins>

Python 2.7 is used for implementation and the model is implemented using Deep Learning library PyTorch. Librosa is used for audio analysis. The model is executed on Intel® AI DevCloud which is 3x to 4x faster than the workstation being used, Intel® AI DevCloud runs the models and processes on high-performance and efficient Intel® Xeon® processors.

# <ins>References</ins>

### Papers :

1. Gatys, Leon A., Alexander S. Ecker, and Matthias Bethge. "Image style transfer using convolutional neural networks." Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition. 2016.
2. Grinstein, Eric, et al. "Audio style transfer." arXiv preprint arXiv:1710.11385 (2017).

### Blogs : 

1. [Audio texture synthesis and style transfer by Dmitry Ulyanov and Vadim Lebedev](https://dmitryulyanov.github.io/audio-texture-synthesis-and-style-transfer/)

### Code Implementations :

1. [Advanced Pytorch Tutorial for Neural Style Transfer](http://pytorch.org/tutorials/advanced/neural_style_tutorial.html#sphx-glr-advanced-neural-style-tutorial-py)

### Technical Components :

1. [Librosa](https://librosa.github.io/librosa/)
2. [Pytorch](https://pytorch.org/)
3. [Intel AI DevCloud](https://software.intel.com/en-us/ai-academy/devcloud)

### Project Resources :

1. [Intel DevMesh Project](https://devmesh.intel.com/projects/neural-style-transfer-on-audio-signals)
2. [Github Repository](https://github.com/alishdipani/Neural-Style-Transfer-Audio)

