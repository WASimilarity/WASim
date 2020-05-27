FROM alanroma/chromium_dump_wasm:firstpush

WORKDIR /usr/src/app

COPY binaries binaries

RUN npm config set puppeteer_skip_chromium_download true -g

COPY package*.json ./

RUN npm install -y

RUN npm install

# RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
#     && mkdir -p /home/pptruser/Downloads \
#     && chown -R pptruser:pptruser /home/pptruser \
#     && chown -R pptruser:pptruser ./node_modules \
#     && chown -R pptruser:pptruser /usr/src/app

COPY .next .next
COPY components components
COPY pages pages
COPY public public
COPY upload upload
COPY config.json config.json
COPY server.js server.js
COPY WebAssemblyAnalysis_Modules WebAssemblyAnalysis_Modules

ENV NODE_ENV=production

CMD xvfb-run -a --server-args="-screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR"  node --max-old-space-size=4192 server.js