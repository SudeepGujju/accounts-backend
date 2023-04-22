const FileFormats = {
  Text: "text/plain",
  JPG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  CSV: "text/csv",
  XLS: "application/vnd.ms-excel", //getting MIME type as -> application/vnd.ms-excel if csv was saved using MS_Excel. So use this File Format along with text/csv for csv file format validation.
};

module.exports = { FileFormats };
