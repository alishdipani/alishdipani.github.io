---
layout: post
title: Rubyplot installation guide
date: 2019-06-09 12:00:00
permalink: /gsoc2019/2019/06/09/Rubyplot-installation-guide/
tags: gsoc2019, rubyplot
---

Summary: Installation guide for Rubyplot.  

**Table of Contents**
* TOC
{:toc}

# Introduction
This blog is a guide for Developer installation of Rubyplot and testing including both GR and ImageMagick backends.  

# Installation
P.S.- Make sure you have installed Ruby and have updated it to the latest version.  
  
Installation steps:
1. Installing GR C Framework: Follow the instructions given [[here]](https://software.opensuse.org/download.html?project=science:gr-framework&package=python-gr) but change the command to sudo apt-get install gr (instead of sudo apt-get install python-gr).  
GR will be installed in the path : `/usr/gr`
2. Create a symbolic link for GR in the path `/usr/local/gr` using this command:  
```bash
sudo ln -s /usr/gr /usr/local/gr
```
3. Clone the Rubyplot repository using this command:
```
git clone https://github.com/SciRuby/rubyplot.git
```
4. Change the current directory to Rubyplot folder by using this command:
```bash
cd rubyplot
```
5. Now set the important environment variables by running this command:
```shell
export GRDIR="/usr/local/gr"
export GKS_FONTPATH="/usr/local/gr"
export RUBYPLOT_BACKEND="GR"
```
Alternatively you can set `GRDIR` and `GKS_FONTPATH` to the path where GR is installed if it's different.  
We have set the Rubyplot backend to GR.  
6. Replace line 3 and 4 in `ext/grruby/extconf.rb` by these lines:
```
$CFLAGS << ' -I/usr/local/gr/include '
$LDFLAGS << ' -L/usr/local/gr/lib -lGR -lm -Wl,-rpath,/usr/local/gr/lib '
```
Or change it to the path where GR is present if different.  
7. Change lines 13 and 14 in `spec/spec_helper.rb` to this:
```
ENV['GRDIR'] = "/usr/local/gr"
ENV['GKS_FONTPATH'] = "/usr/local/gr"
```
Or change it to the path where GR is present if different.  
8. Run these commands:
```bash
sudo gem install bundler
bundle install
rake compile
```
GR backend has been setup, now we need to set up the ImageMagick backend.
9. To install ImageMagick and rmagick follow the instructions [[here]](https://github.com/rmagick/rmagick).  
10. Now, we have setup both the backends and can change the backends at any time using this command:
```bash
export RUBYPLOT_BACKEND="GR" # For GR backend
export RUBYPLOT_BACKEND="MAGICK" # For ImageMagick backend
```
  
# Testing
## Running all tests at once
To run all the tests at once, run this command in the rubyplot folder:
```bash
rspec
```
## Running specific tests
For running specific tests follow these instructions:
1. Make sure you are in the rubyplot folder.  
2. Change the backend to desired one by following step 10 of Installation.  
3. Tests related to specific plots are present in `spec/axes_spec.rb` and tests general tests are present in `spec/figure_sprc.rb`.  
4. Append `,focus:true` in front of the test(s) which you want to run, for example, the bubble plot tests are:
```ruby
context "#bubble!" do
    it "plots a single bubble plot" do
      @figure = Rubyplot::Figure.new
      axes = @figure.add_subplot! 0,0
      axes.bubble! do |p|
        p.data [-1, 19, -4, -23], [-35, 21, 23, -4], [4.5, 1.0, 2.1, 0.9]
        p.label = "apples"
        p.color = :blue
      end
      axes.x_range = [-40, 30]
      axes.y_range = [-40, 25]
      axes.title = "simple bubble plot."
    end

    it "plots multiple bubble plots on same axes." do 
      @figure = Rubyplot::Figure.new
      axes = @figure.add_subplot! 0,0
      axes.bubble! do |p|
        p.data [-1, 19, -4, -23], [-35, 21, 23, -4], [4.5, 1.0, 2.1, 0.9]
        p.label = "apples"
      end
      axes.bubble! do |p|
        p.data [20, 30, -6, -3], [-1, 5, -27, -3], [10.3, 10.0, 20.0, 10.0]
        p.label = "peaches"
      end
      axes.title = "simple bubble plot."
    end
end
```
Append `,focus:true` in front of `context "#bubble!"` if you want to run every test in the context of bubble plot.  
Or append `,focus:true` in front of any test which you want to run, for example, in front of `it "plots a single bubble plot"`.  
An example for appended code is:
```ruby
context "#bubble!",focus:true do
    it "plots a single bubble plot",focus:true do
      @figure = Rubyplot::Figure.new
      axes = @figure.add_subplot! 0,0
      axes.bubble! do |p|
        p.data [-1, 19, -4, -23], [-35, 21, 23, -4], [4.5, 1.0, 2.1, 0.9]
        p.label = "apples"
        p.color = :blue
      end
      axes.x_range = [-40, 30]
      axes.y_range = [-40, 25]
      axes.title = "simple bubble plot."
    end

    it "plots multiple bubble plots on same axes.",focus:true do 
      @figure = Rubyplot::Figure.new
      axes = @figure.add_subplot! 0,0
      axes.bubble! do |p|
        p.data [-1, 19, -4, -23], [-35, 21, 23, -4], [4.5, 1.0, 2.1, 0.9]
        p.label = "apples"
      end
      axes.bubble! do |p|
        p.data [20, 30, -6, -3], [-1, 5, -27, -3], [10.3, 10.0, 20.0, 10.0]
        p.label = "peaches"
      end
      axes.title = "simple bubble plot."
    end
end
```
Append it in front of all tests which you want to run.  
5. Run this command:
```bash
rspec --t=focus`
```

# Refrences
1. [GRRuby](https://github.com/pgtgrly/GRruby-extension)  
2. [Rubyplot](https://github.com/SciRuby/rubyplot)  
3. [Rmagick](https://rmagick.github.io/)
4. [GR](https://gr-framework.org/)
