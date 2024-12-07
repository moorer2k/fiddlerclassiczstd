public static RulesOption("Decode ZSTD")
BindPref("fiddlerscript.rules.DecodeZSTD")
var m_DecodeZSTD: boolean = false; 

public static RulesOption("ZSTD Bin Path")
BindPref("fiddlerscript.rules.ZSTDBinPath")
var m_ZSTDBinPath = "D:\\Downloads\\zstd-v1.5.6-win64"; // Path to your zstd.exe bin

static function decodeZSTD(oSession: Session) {
	var tempDir = System.IO.Path.GetTempPath();
	var encodedFileName = System.IO.Path.GetRandomFileName();
	var decodedFileName = System.IO.Path.GetRandomFileName();

	var encodedFilePath = System.IO.Path.Combine(tempDir, encodedFileName);
	var decodedFilePath = System.IO.Path.Combine(tempDir, decodedFileName);

	try {
		oSession.utilDecodeResponse();
		oSession.SaveResponseBody(encodedFilePath);

		var psi = new System.Diagnostics.ProcessStartInfo();
		psi.FileName = System.IO.Path.Combine(m_ZSTDBinPath, "zstd.exe");
		psi.Arguments = "-d -f " + encodedFilePath + " -o " + decodedFilePath;
		psi.CreateNoWindow = true;
		psi.UseShellExecute = false;
		psi.RedirectStandardOutput = true;
		psi.RedirectStandardError = true;

		var process = System.Diagnostics.Process.Start(psi);
		var output = process.StandardOutput.ReadToEnd() + process.StandardError.ReadToEnd();

		if (!process.WaitForExit(10000)) {
			process.Kill();
			FiddlerApplication.Log.LogString("Zstd process timed out and was forcibly terminated.");
		} else if (process.ExitCode === 0) {
			var content = System.IO.File.ReadAllText(decodedFilePath);
			oSession.utilSetResponseBody(content);
			oSession.oResponse.headers.Remove("Content-Encoding");
			oSession.oResponse.headers["Content-Length"] = content.length.toString();
			FiddlerApplication.Log.LogString("Decoded ZSTD response for session: " + oSession.id);
		} else {
			FiddlerApplication.Log.LogString("Failed to decode ZSTD for session: " + oSession.id + ". Exit code: " + process.ExitCode + ". Output: " + output);
		}
	} catch (ex) {
		FiddlerApplication.Log.LogString("Error in ZSTD decoding: " + ex.Message);
	} finally {
		try {
			if (System.IO.File.Exists(encodedFilePath)) System.IO.File.Delete(encodedFilePath);
			if (System.IO.File.Exists(decodedFilePath)) System.IO.File.Delete(decodedFilePath);
		} catch (cleanupEx) {
			FiddlerApplication.Log.LogString("Failed to clean up temporary files: " + cleanupEx.Message);
		}
	}
}

static function checkZSTDBinPath() {
	try {
		var zstdBin = System.IO.Path.Combine(m_ZSTDBinPath, "zstd.exe");
		if (System.IO.File.Exists(zstdBin)) {
			return true; // Path exists, return true
		} else {
			throw new Error("ZSTD binary not found at specified path: " + zstdBin);
		}
	} catch (err) {
		// Log the error
		FiddlerApplication.Log.LogString(err.message);
		if (FiddlerApplication.Prefs.GetBoolPref("fiddlerscript.rules.ShowAlerts", true)) {
			MessageBox.Show(err.message, "Error with ZSTD Path");
		}
		return false; // Path does not exist, return false
	}
}

static function OnBeforeResponse(oSession: Session) {
	if (m_DecodeZSTD && oSession.ResponseHeaders.ExistsAndContains("Content-Encoding", "zstd")) {
		if (!checkZSTDBinPath()) { 
			return; // Skip decoding attempt if path check fails
		}
		decodeZSTD(oSession);
	}
	if (m_Hide304s && oSession.responseCode == 304) {
	    oSession["ui-hide"] = "true";
	}
}
