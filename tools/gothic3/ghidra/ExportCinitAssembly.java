// @category Gothic3.Study
// Export current instruction boundaries from recovered callback bodies.
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import ghidra.app.util.headless.HeadlessScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;

public class ExportCinitAssembly extends HeadlessScript {
    @Override public void run() throws Exception {
        String[] args=getScriptArgs();
        if(args.length!=3 || currentProgram==null || !args[2].equalsIgnoreCase(currentProgram.getExecutableSHA256())) throw new IllegalArgumentException("addresses output expected_sha256");
        Path output=Paths.get(args[1]); Files.createDirectories(output);
        for(String line:Files.readAllLines(Paths.get(args[0]),StandardCharsets.UTF_8)) {
            monitor.checkCancelled(); Address a=currentProgram.getAddressFactory().getAddress(line.trim());
            Function f=currentProgram.getFunctionManager().getFunctionAt(a);
            if(f==null) throw new IllegalArgumentException("No exact function: "+line);
            StringBuilder text=new StringBuilder();
            InstructionIterator it=currentProgram.getListing().getInstructions(f.getBody(),true);
            while(it.hasNext()) {
                Instruction i=it.next(); text.append(i.getAddress()).append(" | ");
                for(byte b:i.getBytes()) text.append(String.format("%02x",b & 255));
                text.append(" | ").append(i).append('\n');
            }
            Files.writeString(output.resolve(a+".asm.txt"),text.toString(),StandardCharsets.UTF_8,StandardOpenOption.CREATE_NEW);
        }
        println("Callback assembly export complete");
    }
}
