function renderVersionLabel(versionViewModel) {
  if (!versionViewModel || typeof versionViewModel.version !== "string") {
    throw new Error("version view model is required");
  }

  return `API version: ${versionViewModel.version}`;
}

module.exports = { renderVersionLabel };
