// @category Gothic3.Study
// Run only in a separate project copy. Recover exact native table targets.
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import ghidra.app.util.headless.HeadlessScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class RecoverCinitCallbacks extends HeadlessScript {
    @Override public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 4 || currentProgram == null) throw new IllegalArgumentException("addresses accepted report expected_sha256");
        if (!args[3].equalsIgnoreCase(currentProgram.getExecutableSHA256())) throw new IllegalArgumentException("Input hash mismatch");
        StringBuilder accepted = new StringBuilder(), report = new StringBuilder("address,status,body_bytes\n");
        int count = 0, failed = 0;
        for (String line : Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8)) {
            monitor.checkCancelled();
            Address address = currentProgram.getAddressFactory().getAddress(line.trim());
            if (address == null) throw new IllegalArgumentException(line);
            Function f = currentProgram.getFunctionManager().getFunctionAt(address);
            String status = "existing";
            if (f == null) {
                if (currentProgram.getFunctionManager().getFunctionContaining(address) != null) {
                    report.append(address).append(",overlapping-function,0\n"); failed++; continue;
                }
                disassemble(address);
                if (currentProgram.getListing().getInstructionAt(address) != null) f = createFunction(address, null);
                status = f == null ? "creation-failed" : "created";
            }
            if (f != null) { accepted.append(address).append('\n'); count++; } else failed++;
            report.append(address).append(',').append(status).append(',').append(f == null ? 0 : f.getBody().getNumAddresses()).append('\n');
        }
        Files.writeString(Paths.get(args[1]), accepted.toString(), StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        Files.writeString(Paths.get(args[2]), report.toString(), StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        println("Recovered exact callback functions=" + count + " unresolved=" + failed);
    }
}
