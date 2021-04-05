FROM hassanamin994/node_ffmpeg:6
WORKDIR /automatic-video-break-service

# INSTALL PIP3 and alias python/pip to python3/pip3
RUN apt-get update -y
RUN apt-get install python3-pip -y
RUN echo 'alias pip="pip3"' >> ~/.bashrc
RUN echo 'alias python="python3"' >> ~/.bashrc

# INSTALL tensorflow and inaSpeechSegmenter
RUN python3 -m pip install --upgrade pip
RUN pip3 install -q tensorflow==2.2
RUN pip3 install -q inaSpeechSegmenter
RUN pip3 install -q matplotlib==3.2  
RUN pip3 install -q plotly

COPY . .
RUN npm install

EXPOSE 4000
CMD ["npm", "run", "docker:prod"]
