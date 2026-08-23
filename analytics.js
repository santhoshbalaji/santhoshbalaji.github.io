(() => {
  const isProduction = window.location.hostname === "santhoshbalaji.cloud";
  const privacySignalEnabled =
    navigator.globalPrivacyControl === true ||
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    navigator.msDoNotTrack === "1";

  if (!isProduction || privacySignalEnabled || document.querySelector("script[data-cf-beacon]")) return;

  const beacon = document.createElement("script");
  beacon.type = "module";
  beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
  beacon.setAttribute("data-cf-beacon", JSON.stringify({ token: "470bd1ee393e4dd59e06ef384b0c157f" }));
  document.head.append(beacon);
})();
