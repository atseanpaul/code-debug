import { MI2DebugSession } from './mibase';
import { DebugSession, InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent, Thread, StackFrame, Scope, Source, Handles } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { MI2 } from "./backend/mi2/mi2";
import { SSHArguments, ValuesFormattingMode } from './backend/backend';


export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	none: string;
}

export interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments {
	src_dir: string;
	cros_sdk_path: string;
	gdbpath: string;
	debugger_args: string[];
	cacheThreads: boolean;
	executable: string;
	target: string;
	valuesFormatting: ValuesFormattingMode;
	printCalls: boolean;
	showDevDebugOutput: boolean;
	autorun: string[];
}

class CrosGDBDebugSession extends MI2DebugSession {
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body.supportsGotoTargetsRequest = true;
		response.body.supportsHitConditionalBreakpoints = true;
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsConditionalBreakpoints = true;
		response.body.supportsFunctionBreakpoints = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsSetVariable = true;
		response.body.supportsStepBack = true;
		this.sendResponse(response);
	}

	protected launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): void {
	}

	protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
		this.miDebugger = new MI2(args.cros_sdk_path, [], [], null);
		this.initDebugger();
		this.quit = false;
		this.attached = true;
		this.needContinue = true;
		this.translatePaths = true;
		this.debugReady = false;

		this.switchCWD = "/mnt/host/source/src";
		this.trimCWD = args.src_dir;

		this.setValuesFormattingMode(args.valuesFormatting);

		this.miDebugger.cacheThreads = !!args.cacheThreads;
		this.miDebugger.printCalls = !!args.printCalls;
		this.miDebugger.debugOutput = !!args.showDevDebugOutput;

		this.miDebugger.chroot_connect(args.src_dir, args.cros_sdk_path, args.gdbpath, args.executable, args.target).then(() => {
			if (args.autorun)
				args.autorun.forEach(command => {
					this.miDebugger.sendUserInput(command);
				});
			this.sendResponse(response);
		}, err => {
			this.sendErrorResponse(response, 102, `Failed to attach: ${err.toString()}`);
		});
}
}

DebugSession.run(CrosGDBDebugSession);
