// @category Gothic3.Study
// @description Retry only listed internal entries. Args: output addresses.txt expected_input_sha256 timeout_seconds workers
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import generic.cache.CachingPool;
import generic.cache.CountingBasicFactory;
import generic.concurrent.GThreadPool;
import generic.concurrent.QCallback;
import ghidra.app.decompiler.*;
import ghidra.app.decompiler.parallel.*;
import ghidra.app.util.headless.HeadlessScript;
import ghidra.framework.Application;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;

public class ExportSelectedFunctions extends HeadlessScript {
    private static class Result {
        Function function; String status="not_attempted",error="",signature="",code="";long elapsed;
        Result(Function f){function=f;}
    }
    @Override public void run() throws Exception {
        String[] args=getScriptArgs();
        if(currentProgram==null || args.length!=5)throw new IllegalArgumentException("output addresses expected_sha256 timeout workers required");
        Path output=Paths.get(args[0]).toAbsolutePath(),addressFile=Paths.get(args[1]).toAbsolutePath();
        int timeout=Integer.parseInt(args[3]),workers=Integer.parseInt(args[4]);
        if(timeout<1 || timeout>300 || workers<2 || workers>3)throw new IllegalArgumentException("timeout=1..300, workers=2..3");
        if(!args[2].matches("(?i)[0-9a-f]{64}") || !args[2].equalsIgnoreCase(currentProgram.getExecutableSHA256()))
            throw new IllegalArgumentException("Program input SHA-256 does not match retry manifest");
        List<Function> functions=new ArrayList<>();Set<Address> seen=new HashSet<>();
        for(String line:Files.readAllLines(addressFile,StandardCharsets.UTF_8)) {
            line=line.trim();if(line.isEmpty() || line.startsWith("#"))continue;
            Address address=currentProgram.getAddressFactory().getAddress(line);
            if(address==null || !seen.add(address))throw new IllegalArgumentException("Invalid/duplicate address: "+line);
            Function function=currentProgram.getFunctionManager().getFunctionAt(address);
            if(function==null || function.isExternal())throw new IllegalArgumentException("Entry is not an exact internal function: "+line);
            functions.add(function);
        }
        if(functions.isEmpty())throw new IllegalArgumentException("Empty selected address manifest");
        functions.sort(Comparator.comparing(Function::getEntryPoint));
        if(Files.exists(output.resolve("retry_functions.csv")))throw new IOException("Existing retry result must not be overwritten");
        Files.createDirectories(output.resolve("pseudocode"));
        DecompileOptions options=new DecompileOptions();options.grabFromProgram(currentProgram);
        options.setDefaultTimeout(timeout);options.setMaxPayloadMBytes(64);
        GThreadPool.getSharedThreadPool("Parallel Decompiler").setMaxThreadCount(workers);
        CachingPool<DecompInterface> pool=new CachingPool<>(new CountingBasicFactory<DecompInterface>() {
            @Override public DecompInterface doCreate(int n) throws IOException {
                DecompInterface d=new DecompInterface();d.setOptions(options);d.toggleCCode(true);d.toggleSyntaxTree(true);d.setSimplificationStyle("decompile");
                if(!d.openProgram(currentProgram)){String message=d.getLastMessage();d.dispose();throw new IOException(message);}return d;
            }
            @Override public void doDispose(DecompInterface d){d.dispose();}
        });
        QCallback<Function,Result> callback=(function,taskMonitor)->{
            Result r=new Result(function);long start=System.nanoTime();DecompInterface d=null;
            try {
                r.signature=function.getPrototypeString(true,true);
                if(taskMonitor.isCancelled())r.status="cancelled";
                else if(currentProgram.getListing().getInstructionAt(function.getEntryPoint())==null){r.status="no_instruction_at_entry";r.error="No disassembled instruction at function entry";}
                else {
                    d=pool.get();DecompileResults dr=d.decompileFunction(function,timeout,taskMonitor);
                    if(dr==null){r.status="no_result";r.error="Decompiler returned null";}
                    else {
                        r.error=nz(dr.getErrorMessage());DecompiledFunction df=dr.getDecompiledFunction();
                        if(dr.decompileCompleted() && df!=null && !nz(df.getC()).isBlank()){
                            r.status="decompiled";r.code=df.getC();r.signature=nz(df.getSignature());
                        }else if(dr.isTimedOut())r.status="timeout";
                        else if(dr.isCancelled())r.status="cancelled";
                        else if(dr.failedToStart())r.status="failed_to_start";
                        else r.status="decompile_failed";
                    }
                }
            }catch(Exception e){r.status="exception";r.error=e.getClass().getName()+": "+nz(e.getMessage());if(d!=null)d.resetDecompiler();}
            finally {if(d!=null)pool.release(d);r.elapsed=(System.nanoTime()-start)/1000000;}return r;
        };
        ChunkingParallelDecompiler<Result> parallel=ParallelDecompiler.createChunkingParallelDecompiler(callback,monitor);
        Map<String,Long> counts=new TreeMap<>();boolean complete=false;
        try {
            List<Result> results=parallel.decompileFunctions(functions);results.sort(Comparator.comparing(r->r.function.getEntryPoint()));
            try(BufferedWriter csv=Files.newBufferedWriter(output.resolve("retry_functions.csv"),StandardCharsets.UTF_8)) {
                csv.write("address,name,qualified_name,signature,status,error,elapsed_ms,body_bytes,body_ranges,is_thunk,source,pseudocode_file,pseudocode_line\n");
                for(Result r:results) {
                    Function f=r.function;String relative="pseudocode/entry_"+f.getEntryPoint().toString().replace(':','_')+".c";
                    String code="/* Targeted retry; recovered C-like pseudocode, not original source. */\n\n"+
                        "/* ENTRY "+f.getEntryPoint()+" | "+comment(f.getName(true))+" | STATUS "+r.status+" */\n";
                    if(!r.error.isBlank())code+="/* DIAGNOSTIC: "+comment(r.error)+" */\n";
                    code+=r.status.equals("decompiled")?r.code:"/* No usable C output. Recovered declaration follows. */\n"+r.signature+";\n";
                    Files.writeString(output.resolve(relative),code,StandardCharsets.UTF_8);
                    csv.write(csv(f.getEntryPoint(),f.getName(),f.getName(true),r.signature,r.status,r.error,r.elapsed,
                        f.getBody().getNumAddresses(),ranges(f.getBody()),f.isThunk(),f.getSymbol().getSource(),relative,3)+"\n");
                    counts.merge(r.status,1L,Long::sum);println("Targeted retry "+f.getEntryPoint()+" "+r.status+" "+r.elapsed+"ms");
                }
            }
            complete=results.size()==functions.size();
        }finally {
            parallel.dispose();pool.dispose();
            StringBuilder json=new StringBuilder("{\n  \"program\": "+json(currentProgram.getName())+",\n  \"sha256\": "+json(currentProgram.getExecutableSHA256())+
                ",\n  \"ghidra_version\": "+json(Application.getApplicationVersion())+",\n  \"complete_selected_functions\": "+complete+
                ",\n  \"selected_functions\": "+functions.size()+",\n  \"timeout_seconds_per_function\": "+timeout+",\n  \"workers\": "+workers+",\n  \"status_counts\": {");
            boolean first=true;for(Map.Entry<String,Long> e:counts.entrySet()){if(!first)json.append(',');first=false;json.append("\n    ").append(json(e.getKey())).append(": ").append(e.getValue());}
            Files.writeString(output.resolve("retry_coverage.json"),json.append("\n  }\n}\n").toString(),StandardCharsets.UTF_8);
        }
    }
    private static String ranges(AddressSetView body){StringBuilder b=new StringBuilder();AddressRangeIterator i=body.getAddressRanges();while(i.hasNext()){AddressRange r=i.next();if(b.length()>0)b.append(';');b.append(r.getMinAddress()).append('-').append(r.getMaxAddress());}return b.toString();}
    private static String csv(Object...values){StringJoiner j=new StringJoiner(",");for(Object v:values)j.add("\""+nz(v).replace("\"","\"\"")+"\"");return j.toString();}
    private static String json(String value){return "\""+nz(value).replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r").replace("\t","\\t")+"\"";}
    private static String comment(String value){return nz(value).replace("*/","* /");}
    private static String nz(Object value){return value==null?"":value.toString();}
}
