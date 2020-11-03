FROM node:buster

RUN ["adduser",  "--home",  "/usr/src/app", "--system", "sandboxuser"]
RUN ["chown", "-R", "sandboxuser", "/usr/src/app"]
RUN ["chmod", "-R", "u+rwx", "/usr/src/app"]

COPY ./shared /usr/src/app

WORKDIR /usr/src/app

RUN npm install

COPY start.sh /
RUN chmod 755 /start.sh

RUN apt-get update

# Install python 3
RUN apt-get update && apt-get install -y python3 python3-pip

RUN pip3 install setuptools -U

RUN pip3 install -r requirements.txt

CMD ["/start.sh"]
