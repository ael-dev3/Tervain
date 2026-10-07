// @category Gothic3.Study
// Read-only inspection of exact initializer targets; never creates functions.
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import ghidra.app.util.headless.HeadlessScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;

public class InspectCinitCallbacks extends HeadlessScript {
    @Override public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 3 || currentProgram == null) throw new IllegalArgumentException("addresses output expected_sha256");
        if (!args[2].equalsIgnoreCase(currentProgram.getExecutableSHA256())) throw new IllegalArgumentException("Input hash mismatch");
        StringBuilder out = new StringBuilder("address,function_at,function_containing,instruction_at,body_bytes\n");
        int total = 0, exact = 0, instructions = 0;
        for (String line : Files.readAllLines(Paths.get(args[0]), StandardCharsets.UTF_8)) {
            Address address = currentProgram.getAddressFactory().getAddress(line.trim());
            if (address == null) throw new IllegalArgumentException(line);
            Function f = currentProgram.getFunctionManager().getFunctionAt(address);
            Function containing = currentProgram.getFunctionManager().getFunctionContaining(address);
            Instruction instruction = currentProgram.getListing().getInstructionAt(address);
            total++; if (f != null) exact++; if (instruction != null) instructions++;
            out.append(address).append(',').append(f == null ? "" : f.getEntryPoint()).append(',')
                .append(containing == null ? "" : containing.getEntryPoint()).append(',')
                .append(instruction != null).append(',').append(f == null ? 0 : f.getBody().getNumAddresses()).append('\n');
        }
        Files.writeString(Paths.get(args[1]), out.toString(), StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
        println("Initializer targets=" + total + " exactFunctions=" + exact + " instructionEntries=" + instructions);
    }
}
