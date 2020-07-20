/*
const filesIn = (root) => {

}

const prepareFolderContentForStaticService = (absolutePath) => {
  let pathReps = klawSync(absolutePath, {
    nodir: true,
  });
  let pathStructs = [];
  for (let pathRep of pathReps) {
    let localRelativePath = pathRep.path.replace(absolutePath, "");
    let ext = localRelativePath.split(".").pop();
    let targetRelativePath = localRelativePath;
    let compress = true;
    let contentType;
    switch (ext) {
      case "css":
        contentType = "text/css";
        break;
      case "html":
        contentType = "text/html";
        let split = targetRelativePath.split("/");
        if ("index.html" === split.pop()) {
          targetRelativePath = split.join("/");
          targetRelativePath = targetRelativePath.length ? targetRelativePath : "/";
        }
        break;
      case "ico":
        contentType = "image/x-icon";
        break;
      case "jpg":
        contentType = "image/jpeg";
        compress = false;
        break;
      case "js":
        contentType = "text/javascript";
        break;
      case "json":
        contentType = "application/json";
        break;
      case "mp4":
        contentType = "video/mp4";
        compress = false;
        break;
      case "png":
        contentType = "image/png";
        compress = false;
        break;
      case "svg":
        contentType = "image/svg+xml";
        break;
      case "txt":
        contentType = "text/plain";
        break;
      case "wasm":
        contentType = "application/wasm";
        compress = false;
        break;
      case "webmanifest":
        contentType = "application/manifest+json"; // https://w3c.github.io/manifest/#media-type-registration
        break;
      case "woff":
        contentType = "font/woff";
        compress = false;
        break;
      case "woff2":
        contentType = "font/woff2";
        compress = false;
        break;
      case "xml":
        contentType = "text/xml";
        break;
      default:
        logger("commons.viero.tv-util").info(`Skipping unknown file ${localRelativePath}`);
        continue;
    }
    let identity = fs.readFileSync(pathRep.path);
    let hash = cryptoJS.createHash("md5");
    hash.update(identity);
    const md5 = hash.digest("hex");
    let contentLengthIdentity = Buffer.byteLength(identity);
    let br;
    let contentLengthBr;
    let gz;
    let contentLengthGz;
    if (compress) {
      if (config.FRONTEND.BROTLI) {
        br = iltorb.compressSync(identity, { mode: 1, quality: 11 });
        contentLengthBr = Buffer.byteLength(br);
      }
      if (config.FRONTEND.GZIP) {
        gz = zlib.gzipSync(identity, { level: 9 });
        contentLengthGz = Buffer.byteLength(gz);
      }
      if (localRelativePath !== targetRelativePath) {
        logger("commons.viero.tv-util").info(
          `${targetRelativePath} => ${localRelativePath} ${contentLengthIdentity || '-'}/${contentLengthGz || '-'}/${contentLengthBr || '-'}`
        );
      } else {
        logger("commons.viero.tv-util").info(
          `${localRelativePath} ${contentLengthIdentity || '-'}/${contentLengthGz || '-'}/${contentLengthBr || '-'}`
        );
      }
    } else {
      if (localRelativePath !== targetRelativePath) {
        logger("commons.viero.tv-util").info(
          `${targetRelativePath} => ${localRelativePath} ${contentLengthIdentity || '-'}`);
      } else {
        logger("commons.viero.tv-util").info(
          `${localRelativePath} ${contentLengthIdentity || '-'}`);
      }
    }
    pathStructs.push({
      targetRelativePath,
      contentType,
      identity,
      contentLengthIdentity,
      br,
      contentLengthBr,
      gz,
      contentLengthGz,
      md5,
    });
  }
  logger("commons.viero.tv-util").info('------------------------------------------');
  logger("commons.viero.tv-util").info(`Done processing files in ${absolutePath}`);
  logger("commons.viero.tv-util").info('------------------------------------------');
  return Promise.resolve(pathStructs);
};
*/
