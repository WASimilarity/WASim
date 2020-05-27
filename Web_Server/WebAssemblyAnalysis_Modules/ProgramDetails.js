const readline = require('readline');
const fs = require('fs');
const path = require('path');
const lodash = require('lodash');
const { v4: uuid } = require('uuid');
const {
    promisify
} = require('util');
const exec = promisify(require('child_process').exec);
const {
    makeFileHash
} = require('./CommonUtilities');
const TOKENS = require('./token_constants');
const CONFIG = require('../config.json');

const wabt_wasm2wat_path = process.env.WABT_WASM2WAT_PATH || CONFIG.wabt_wasm2wat_path
const asm_binary_converter_path = process.env.ASM_BINARY_CONVERTER_PATH || CONFIG.asm_binary_converter_path;
const asm_binary_converter_alt_path = process.env.ASM_BINARY_CONVERTER_ALT_PATH || CONFIG.asm_binary_converter_alt_path;
const asm_wasm_output_path = process.env.ASM_WASM_OUTPUT_PATH || CONFIG.asm_wasm_output_path;
const wat_output_path = process.env.WAT_OUTPUT_PATH || CONFIG.wat_output_path;

const WABT_WASM2WAT_PATH = path.join(__dirname, wabt_wasm2wat_path);
const ASM_BINARY_CONVERTER_PATH = path.join(__dirname, asm_binary_converter_path)
const ASM_BINARY_CONVERTER_ALT_PATH = path.join(__dirname, asm_binary_converter_alt_path)
const ASM_WASM_OUTPUT_PATH = path.join(__dirname, asm_wasm_output_path);
const WAT_OUTPUT_PATH = path.join(__dirname, wat_output_path);
const MAX_CALL_DEPTH = 3;

class FunctionDetails {
    constructor(functionName, programDetails) {
        this.Name = functionName;
        this.Params = [];
        this.Calls = [];
        this.NumberOfLoops = 0;
        this.NumberOfIfs = 0;
        this.Loops = [];
        this.Ifs = [];
        this.LoopLines = [];
        this.HasResult = false;
        this.ResultType = null;
        this.FunctionType = null;
        // this.LinesOfCode = 0;
        this.Simulator = new VirtualStateManager(programDetails);
        this.ControlFlowGraph = null;
        this.StartingLineNumber = 0;
        this.EndingLineNumber = 0;
    }
}

class DataSection {
    constructor(startOffset, payload) {
        this.Start = startOffset;
        this.Payload = payload;
    }
}

class ImportDetails {
    constructor(name, type = TOKENS.FUNCTION_TOKEN) {
        this.Name = name;
        this.Type = type;
        this.FunctionType = null;
        this.ImportedName = null;
    }
}

class ExportDetails {
    constructor(name, type = TOKENS.FUNCTION_TOKEN) {
        this.Name = name;
        this.Type = type;
        this.ExportSource = null;

    }
}

class TypeDetails {
    constructor(name) {
        this.Name = name;
        this.Params = [];
        this.Result = null;
    }
}

class StackValue {
    constructor() {
        this.type = null;
        this.variableName = null;
    }

    isIMM() {
        if (this.type === 'IMM') {
            return true;
        }

        return false;
    }

    isOP() {
        if (this.type === 'OP') {
            return true;
        }

        return false;
    }

    isREF() {
        if (this.type === 'REF') {
            return true;
        }

        return false;
    }

    isSYM() {
        if (this.type === 'SYM') {
            return true;
        }

        return false;
    }

    updateReference() {
        return this;
    }
}

class SymbolicValue extends StackValue {
    constructor(name, lineNumberSet) {
        super();
        this.name = name;
        this.type = 'SYM';
        this.lineNumberSet = lineNumberSet;
    }

    toString() {
        return `${this.name} (line ${this.lineNumberSet})`;
    }

    updateReference(callArgs) {
        for (const paramName in callArgs) {
            if (this.name == paramName) {
                return callArgs[paramName];
            }
        }

        return this;
    }
}

class Operation extends StackValue {
    constructor(opCode, dataType, lValue, rValue, lineNumberSet) {
        super();

        this.operator = opCode;
        this.lValue = lValue;
        this.rValue = rValue;
        this.dataType = dataType;
        this.lineNumberSet = lineNumberSet;

        this.type = 'OP';
    }

    typeResolver(dataType1, dataType2) {
        if (dataType1 == dataType2) {
            return dataType1;
        }

        if (dataType1 == 'i32' && dataType2 == 'i64') {
            return dataType2;
        }

        if (dataType1 == 'i64' && dataType2 == 'i32') {
            return dataType1;
        }
    }

    getUnsignedInt(int) {
        return new Uint32Array([int])[0];
    }

    execute() {
        const left = this.lValue;
        const right = this.rValue;
        if(this.lValue == undefined){
            console.log(this.lValue)
        }
        if (this.lValue.isIMM() && (this.rValue == null || (this.rValue != null && this.rValue.isIMM()))) {
            let newType;
            switch (this.operator) {
                case 'add':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value + this.rValue.value, newType, this.lineNumberSet);
                case 'sub':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value - this.rValue.value, newType, this.lineNumberSet);
                case 'mul':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value * this.rValue.value, newType, this.lineNumberSet);
                case 'div_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value / this.rValue.value, newType, this.lineNumberSet);
                case 'div_u': // NEED TO FIX THIS
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(
                        this.getUnsignedInt(this.lValue.value) / this.getUnsignedInt(this.rValue.value),
                        newType,
                        this.lineNumberSet,
                    );
                case 'shl':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value << this.lValue.value, newType, this.lineNumberSet);
                case 'shr_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value >> this.lValue.value, newType, this.lineNumberSet);
                case 'shr_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value >>> this.lValue.value, newType, this.lineNumberSet);
                case 'or':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value | this.lValue.value, newType, this.lineNumberSet);
                case 'xor':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value ^ this.lValue.value, newType, this.lineNumberSet);
                case 'and':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.rValue.value & this.lValue.value, newType, this.lineNumberSet);
                case 'rem_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value % this.rValue.value, newType, this.lineNumberSet);

                case 'eq':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value == this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'neq':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value != this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'lt_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value < this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'le_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value <= this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'lt_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(
                        this.getUnsignedInt(this.lValue.value) < this.getUnsignedInt(this.rValue.value) ? 1 : 0,
                        newType,
                        this.lineNumberSet,
                    );
                case 'le_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(
                        this.getUnsignedInt(this.lValue.value) <= this.getUnsignedInt(this.rValue.value) ? 1 : 0,
                        newType,
                        this.lineNumberSet,
                    );
                case 'gt_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value > this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'ge_s':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(this.lValue.value >= this.rValue.value ? 1 : 0, newType, this.lineNumberSet);
                case 'gt_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(
                        this.getUnsignedInt(this.lValue.value) > this.getUnsignedInt(this.rValue.value) ? 1 : 0,
                        newType,
                        this.lineNumberSet,
                    );
                case 'ge_u':
                    newType = this.typeResolver(this.lValue.dataType, this.rValue.dataType);
                    return new ImmediateValue(
                        this.getUnsignedInt(this.lValue.value) > this.getUnsignedInt(this.rValue.value) ? 1 : 0,
                        newType,
                        this.lineNumberSet,
                    );
                case 'eqz':
                    newType = this.lValue.dataType;
                    return new ImmediateValue(this.lValue.value == 0 ? 1 : 0, newType, this.lineNumberSet);
                default:
                    return this;
            }
        } else if (left.isOP() && right != null) {
            if (this.operator == 'sub') {
                if (left.operator == 'add') {
                    if (lodash.isEqual(left.lValue, right)) {
                        return left.rValue;
                    }
                    if (lodash.isEqual(left.rValue, right)) {
                        return left.lValue;
                    }
                }
            }
        } else if (right != null && right.isOP()) {
            if (this.operator == 'sub') {
                if (right.operator == 'add') {
                    if (lodash.isEqual(right.lValue, left)) {
                        return right.rValue;
                    }
                    if (lodash.isEqual(right.rValue, left)) {
                        return right.lValue;
                    }
                }
            }
        }

        return this;
    }

    toString() {
        const leftVal = this.lValue.toString();
        const rightVal = this.rValue == null ? '' : this.rValue.toString();

        // Make fancy with +,-,/, ... later
        let operationCode = this.operator;
        switch (operationCode) {
            case 'add':
                operationCode = '+';
                break;
            case 'sub':
                operationCode = '-';
                break;
            case 'mul':
                operationCode = '*';
                break;
            case 'or':
                operationCode = '|';
                break;
            case 'xor':
                operationCode = '^';
                break;
            case 'shl':
                operationCode = '<<';
                break;
            case 'shr_u':
            case 'shr_s':
                operationCode = '>>';
                break;
        }
        return `${leftVal} ${operationCode} ${rightVal}`;
    }

    getSymbolicValue() {
        let symbolicValue = null;

        let innerOperations = new Queue();
        innerOperations.enqueue(this);

        while (!innerOperations.isEmpty() && innerOperations.items.length < 2000) {
            const val = innerOperations.dequeue();

            if (val.isSYM()) {
                symbolicValue = val;
                break;
            } else if (val.isOP()) {
                innerOperations.enqueue(val.lValue);
                if (val.rValue != null) {
                    innerOperations.enqueue(val.rValue);
                }
            } else if (val.isREF()) {
                innerOperations.enqueue(val.Address);
            }
        }

        innerOperations = null;
        return symbolicValue;
    }

    updateReference(callArgs) {
        const operationStack = [];

        for (const k of Object.keys(callArgs)) {
            const callArg = callArgs[k];
            if (lodash.isEqual(this, callArg)) {
                return this;
            }
        }
        operationStack.push([this.lValue, this, 'lValue']);
        operationStack.push([this.rValue, this, 'rValue']);

        while (operationStack.length > 0 && operationStack.length < 2000) {
            const opGroup = operationStack.pop();
            const op = opGroup[0];
            const parentOp = opGroup[1];
            const parentOpField = opGroup[2];

            if (op.isOP()) {
                operationStack.push([op.lValue, op, 'lValue']);
                if (op.rValue != null) {
                    operationStack.push([op.rValue, op, 'rValue']);
                }
            } else if (op.isSYM()) {
                parentOp[parentOpField] = op.updateReference(callArgs);
            } else if (op.isREF()) {
                operationStack.push([op.Address, op, 'Address']);
            }
        }
        return this;
    }
}

class ImmediateValue extends StackValue {
    constructor(value, dataType, lineNumberSet) {
        super();

        this.value = parseInt(value);
        this.dataType = dataType;
        this.lineNumberSet = lineNumberSet;
        this.type = 'IMM';
    }

    toString() {
        return `${this.value}`;
    }
}

class MemoryReference extends StackValue {
    // very similar to Symbolic Reference but differentiated for address details
    constructor(location, align, offset, lineNumberSet) {
        super();

        this.Address = location;
        this.Align = align; // number of bytes to load/store
        this.Offset = offset;
        this.Value = null;
        this.type = 'REF';
        this.lineNumberSet = lineNumberSet;
    }

    toString() {
        const offset = this.Offset == null ? '' : `+ ${this.Offset} `;
        return `[${this.Address} ${offset}: (${this.Align})]`;
    }

    updateReference(callArgs) {
        this.Address = this.Address.updateReference(callArgs);

        return this;
    }
}

class VariableReference {
    constructor(initialValue, lineNumberSet) {
        this.value = initialValue;
        this.lineNumberSet = lineNumberSet;
        this.previousValues = [];
    }

    update(newValue, lineNumberSet) {
        this.previousValues.push({
            Value: this.value,
            Line: this.lineNumberSet
        });
        this.lineNumberSet = lineNumberSet;
        this.value = newValue;
    }
}

class Abstraction {
    constructor(type, lineNumber) {
        this.Start = lineNumber;
        this.End = null;
        this.AbstractionType = type;
        this.InnerAbstractions = [];
        this.ID = uuid();
        this.ParentAbstraction = null;
    }

    end(lineNumber) {
        this.End = lineNumber;
    }

    canMerge() {
        return false;
    }
}

class SetAbstraction extends Abstraction {
    constructor(lvalue, rvalue, lineNumber) {
        super('SET', lineNumber);
        this.End = this.Start;
        this.LValue = lvalue;
        this.RValue = rvalue;
    }
}

class BlockAbstraction extends Abstraction {
    constructor(lineNumber) {
        super('BLOCK', lineNumber);
    }
}

class StoreAbstraction extends Abstraction {
    constructor(lvalue, rvalue, align, offset, type, opCode, lineNumber) {
        super('STORE', lineNumber);
        this.End = this.Start;
        this.MemoryLocation = lvalue;
        this.Value = rvalue;
        this.Align = align;
        this.Offset = offset;
        this.DataType = type;
        this.OperationCode = opCode;
    }

    canMerge(otherAbstraction) {
        // Can merge with other STORE and MEMCPY
        if (otherAbstraction.AbstractionType == 'STORE') {
            // If values are Immediates, Check if memory locations are adjacent
            if (this.MemoryLocation.isIMM() && otherAbstraction.MemoryLocation.isIMM()) {
                if (Math.abs(this.MemoryLocation.Value - otherAbstraction.MemoryLocation.Value <= 8)) {
                    return true;
                } else {
                    return false;
                }
            }
            // Check the offsets instead to see if they are consecutive
            if (
                this.Offset != null &&
                otherAbstraction.Offset != null &&
                Math.abs(this.Offset - otherAbstraction.Offset) <= 8
            ) {
                return true;
            } else if (
                (this.Offset == null && [1, 2, 4, 8].includes(otherAbstraction.Offset)) ||
                ([1, 2, 4, 8].includes(this.Offset) && otherAbstraction.Offset == null)
            ) {
                if (lodash.isEqual(this.MemoryLocation, otherAbstraction.MemoryLocation)) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else if (otherAbstraction.AbstractionType == 'MEMCPY') {
            const possibleAdjacentItem = otherAbstraction.InnerAbstractions[otherAbstraction.InnerAbstractions.length - 1];

            if (this.MemoryLocation.isIMM() && possibleAdjacentItem.MemoryLocation.isIMM()) {
                if (Math.abs(this.MemoryLocation.Value - possibleAdjacentItem.MemoryLocation.Value <= 8)) {
                    return true;
                } else {
                    return false;
                }
            }
            // Check the offsets instead to see if they are consecutive
            if (
                this.Offset != null &&
                possibleAdjacentItem.Offset != null &&
                Math.abs(this.Offset - possibleAdjacentItem.Offset) <= 8
            ) {
                return true;
            }
            if (
                (this.Offset == null && [1, 2, 4, 8].includes(possibleAdjacentItem.Offset)) ||
                ([1, 2, 4, 8].includes(this.Offset) && possibleAdjacentItem.Offset == null)
            ) {
                if (lodash.isEqual(this.MemoryLocation, possibleAdjacentItem.MemoryLocation)) {
                    return true;
                }
                return false;
            } else {
                return false;
            }
        }
    }

    merge(otherStoreAbstraction, lineNumber) {
        const newMemCpyAbstraction = new MemCpyAbstraction(this, lineNumber);
        newMemCpyAbstraction.merge(otherStoreAbstraction, lineNumber);

        return newMemCpyAbstraction;
    }
}

class ForAbstraction extends Abstraction {
    constructor(lineNumber) {
        super('FOR', lineNumber);

        this.Condition = null;
        this.IncrementExpression = null;
        this.DecrementExpression = null;
        this.DecrementConstant = null;
        this.IncrementConstant = null;
    }

    Get_Condition() {
        if (this.Condition == null) {
            for (let i = this.InnerAbstractions.length - 1; i >= 0; i--) {
                const abstraction = this.InnerAbstractions[i];

                if (abstraction.AbstractionType == 'IF') {
                    this.Condition = abstraction;
                    break;
                }
            }
        }

        return this.Condition;
    }

    Dec_Expr() {
        if (this.DecrementExpression != null) return this.DecrementExpression;

        for (let i = this.InnerAbstractions.length - 1; i >= 0; i--) {
            const abstraction = this.InnerAbstractions[i];

            if (abstraction.AbstractionType == 'SET') {
                if (abstraction.RValue.isOP()) {
                    // check lValue and RValue for Immediate
                    if (abstraction.RValue.operator == 'add') {
                        if (abstraction.RValue.lValue.isIMM()) {
                            if (abstraction.RValue.lValue.value < 0) {
                                this.DecrementExpression = abstraction;
                                this.DecrementConstant = abstraction.RValue.lValue.value;
                            }
                        } else if (abstraction.RValue.rValue.isIMM()) {
                            if (abstraction.RValue.rValue.value < 0) {
                                this.DecrementExpression = abstraction;
                                this.DecrementConstant = abstraction.RValue.rValue.value;
                                break;
                            }
                        }
                    } else if (abstraction.RValue.operator == 'sub') {
                        if (abstraction.RValue.lValue.isIMM()) {
                            if (abstraction.RValue.lValue.value > 0) {
                                this.DecrementExpression = abstraction;
                                this.DecrementConstant = abstraction.RValue.lValue.value;
                                break;
                            }
                        } else if (abstraction.RValue.rValue.isIMM()) {
                            if (abstraction.RValue.rValue.value > 0) {
                                this.DecrementExpression = abstraction;
                                this.DecrementConstant = abstraction.RValue.lValue.value;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return this.DecrementExpression;
    }

    Get_Decrement() {
        if (this.DecrementConstant == null) {
            this.Dec_Expr();
        }

        return this.DecrementConstant;
    }

    Inc_Expr() {
        if (this.IncrementExpression != null) return this.IncrementExpression;
        for (let i = this.InnerAbstractions.length - 1; i >= 0; i--) {
            const abstraction = this.InnerAbstractions[i];

            if (abstraction.AbstractionType == 'SET') {
                if (abstraction.RValue.isOP()) {
                    if (abstraction.RValue.operator == 'add') {
                        if (abstraction.RValue.lValue.isIMM()) {
                            if (abstraction.RValue.lValue.value > 0) {
                                this.IncrementExpression = abstraction;
                                this.IncrementConstant = abstraction.RValue.lValue.value;
                                break;
                            }
                        } else if (abstraction.RValue.rValue.isIMM()) {
                            if (abstraction.RValue.rValue.value > 0) {
                                this.IncrementExpression = abstraction;
                                this.IncrementConstant = abstraction.RValue.rValue.value;
                                break;
                            }
                        }
                    }
                }
            }
        }

        return this.IncrementExpression;
    }

    Get_Increment() {
        if (this.IncrementConstant == null) {
            this.Inc_Expr();
        }

        return this.IncrementConstant;
    }

    end(lineNumber) {
        super.end(lineNumber);
        this.Get_Condition();
        this.Dec_Expr();
        this.Inc_Expr();
    }
}

class CallAbstraction extends Abstraction {
    constructor(functionName, argsPassed, lineNumber) {
        super('CALL', lineNumber);
        this.End = this.Start;
        this.FunctionName = functionName;
        this.Arguments = argsPassed;
        this.Scope = null;
    }
}

class CallIndirectAbstraction extends Abstraction {
    constructor(type, lineNumber) {
        super('CALL_INDIRECT', lineNumber);
        this.FunctionType = type;
        this.Paths = [];
    }
}

class IfAbstraction extends Abstraction {
    constructor(condition, lineNumber) {
        super('IF', lineNumber);
        this.Condition = condition;
        this.ElseAbstractions = [];
    }
}

class MemCpyAbstraction extends Abstraction {
    constructor(firstStore, lineNumber) {
        super('MEMCPY', lineNumber);
        this.End = this.Start;
        this.InnerAbstractions.push(firstStore);

        this.Size = null;
    }

    merge(storeAbstraction, lineNumber) {
        this.InnerAbstractions.push(storeAbstraction);
        this.End = lineNumber;
        return this;
    }

    GetDestArg() {
        // look at first internal STORE abstraction
        const sampleStoreAbstraction = this.InnerAbstractions[0];

        return sampleStoreAbstraction.MemoryLocation;
    }

    GetSourceArg() {
        // look at first internal STORE abstraction
        const sampleStoreAbstraction = this.InnerAbstractions[0];
        return sampleStoreAbstraction.Value;
    }

    GetSizeArg() {
        if (this.Size != null) {
            return this.Size;
        }

        const firstStore = this.InnerAbstractions[0];
        this.Size = this.InnerAbstractions.length * firstStore.Align;
        return this.InnerAbstractions.length * firstStore.Align;
    }

    UpdateWithCallArguments() {
        const callArguments = this.AbstractionCallArguments();
        if (callArguments != null) {
            if (this.Size == null) {
                this.GetSizeArg();
            }
            if (this.Size.updateReference != null) {
                this.Size = this.Size.updateReference(callArguments);
            }

            this.InnerAbstractions.forEach((abstr) => {
                if (abstr.Value != null) {
                    abstr.Value = abstr.Value.updateReference(callArguments);
                }
                abstr.MemoryLocation = abstr.MemoryLocation.updateReference(callArguments);
            });
        }
    }

    AbstractionCallArguments() {
        if (this.ParentAbstraction != null) {
            let abstraction = this.ParentAbstraction;
            while (abstraction != null) {
                if (abstraction.AbstractionType == 'CALL') {
                    return abstraction.Arguments;
                }

                abstraction = abstraction.ParentAbstraction;
            }
        }
        return null;
    }

    IsMemSet() {
        if (this.InnerAbstractions.length < 2) {
            if (this.InnerAbstractions[0].Value.isIMM()) {
                return true;
            }
            const callArguments = this.AbstractionCallArguments();
            if (callArguments != null) {
                this.InnerAbstractions[0].Value = this.InnerAbstractions[0].Value.updateReference(callArguments);
                if (this.InnerAbstractions[0].Value.isOP()) {
                    this.InnerAbstractions[0].Value = this.InnerAbstractions[0].Value.execute();
                    if (this.InnerAbstractions[0].Value.isIMM()) {
                        return true;
                    }
                }
            }
            return false;
        }

        let firstMidpointIndex = Math.floor(this.InnerAbstractions.length / 2);
        const secondMidpointIndex = Math.ceil(this.InnerAbstractions.length / 2);

        if (firstMidpointIndex == secondMidpointIndex) {
            firstMidpointIndex -= 1;
        }

        const firstMidpoint = this.InnerAbstractions[firstMidpointIndex];
        const secondMidpoint = this.InnerAbstractions[secondMidpointIndex];

        let isMemSet = false;
        // Check if Value is Immediate
        if (firstMidpoint.Value.isIMM()) {
            if (secondMidpoint.Value.isIMM()) {
                isMemSet = true;
            }
        } else if (firstMidpoint.Value.isREF()) {
            if (secondMidpoint.Value.isREF()) {
                if (lodash.isEqual(firstMidpoint.Value, secondMidpoint.Value)) {
                    isMemSet = true;
                }
            }
        }

        return isMemSet;
    }
}

class VirtualState {
    constructor() {
        this.LocalVariables = {};
        this.GlobalVariables = {};
        this.VirtualStack = [];
        this.LinearMemory = {
            SymbolicLocations: [],
        };
    }

    push(valueToPush) {
        this.VirtualStack.push(valueToPush);
    }

    pop() {
        return this.VirtualStack.pop();
    }

    getLocalVariable(varName, lineNumber) {
        if (!this.LocalVariables[varName]) {
            const newSymbolicValue = new SymbolicValue(varName, lineNumber);
            const newVarReference = new VariableReference(newSymbolicValue, lineNumber);
            this.LocalVariables[varName] = newVarReference;
        }

        const newVar = lodash.clone(this.LocalVariables[varName].value);

        newVar.variableName = varName;
        return newVar;
    }

    getGlobalVariable(varName, lineNumber) {
        if (!this.GlobalVariables[varName]) {
            const newSymbolicValue = new SymbolicValue(varName, lineNumber);
            const newVarReference = new VariableReference(newSymbolicValue, lineNumber);
            this.GlobalVariables[varName] = newVarReference;
        }

        const newVar = lodash.clone(this.GlobalVariables[varName].value);
        newVar.variableName = varName;
        return newVar;
    }

    setGlobalVariable(varName, valueToSet, lineNumber) {
        if (!this.GlobalVariables[varName]) {
            const newVarReference = new VariableReference(valueToSet, lineNumber);
            this.GlobalVariables[varName] = newVarReference;
        } else {
            this.GlobalVariables[varName].update(valueToSet, lineNumber);
        }
    }

    setLocalVariable(varName, valueToSet, lineNumber) {
      
        if (!this.LocalVariables[varName]) {
            const newVarReference = new VariableReference(valueToSet, lineNumber);
            this.LocalVariables[varName] = newVarReference;
        } else {
            this.LocalVariables[varName].update(valueToSet, lineNumber);
        }
    }



    storeMemory(location, align, valueToSet, lineNumber) {
        if (!this.LinearMemory[location]) {
            const newVarReference = new VariableReference(valueToSet, lineNumber);
            this.LinearMemory[location] = newVarReference;
        } else {
            this.LinearMemory[location].update(valueToSet, lineNumber);
        }
    }
}

class VirtualStateManager {
    constructor(programDetails) {
        this.VirtualStates = [
            [new VirtualState()]
        ];
        this.ContextBreakStack = [];

        this.Abstractions = [];
        this.CurrentAbstractionList = this.Abstractions;
        this.AbstractionStack = [];
        this.UpperAbstraction = null;
        this.ProgramDetails = programDetails;
    }

    addAbstraction(abstraction) {
        if (this.AbstractionStack.length > 0) {
            abstraction.ParentAbstraction = this.UpperAbstraction;
        }
        this.CurrentAbstractionList.push(abstraction);
    }

    moveContextIntoAbstraction(abstraction) {
        this.addAbstraction(abstraction);
        this.AbstractionStack.push(this.CurrentAbstractionList);
        this.CurrentAbstractionList = abstraction.InnerAbstractions;
        this.UpperAbstraction = abstraction;
    }

    moveContextToElse() {
        this.moveContextUp();
        const ifAbstraction = this.CurrentAbstractionList[this.CurrentAbstractionList.length - 1];
        this.AbstractionStack.push(this.CurrentAbstractionList);
        this.CurrentAbstractionList = ifAbstraction.ElseAbstractions;
        this.UpperAbstraction = ifAbstraction;
    }

    moveContextUp() {
        const newStackContext = this.AbstractionStack.pop();
        if (newStackContext != null) {
            this.CurrentAbstractionList = newStackContext;
        }

        if (this.AbstractionStack.length > 0) {
            const previousAbstractionLevel = this.AbstractionStack[this.AbstractionStack.length - 1];
            this.UpperAbstraction = previousAbstractionLevel[previousAbstractionLevel.length - 1];
        } else {
            this.UpperAbstraction = null;
        }
        this.CurrentAbstractionList[this.CurrentAbstractionList.length - 1].end(this.ProgramDetails.lineNumber);
    }

    handleInitialDefinition(functionTypeDetails, lineNumber){
        const functionParams = functionTypeDetails.Params;
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {

            for(let i =0; i < functionParams.length; i++){
                const varName = i.toString();
                const newVal = new SymbolicValue(varName, lineNumber)
                
                activeState.setLocalVariable(varName, newVal,lineNumber);
            }
            
        }, this);
    }

    handleConst(value, dataType) {
        const newImmediateValue = new ImmediateValue(value, dataType, this.ProgramDetails.lineNumber);
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            activeState.push(newImmediateValue);
        }, this);
    }

    handleBinaryOperation(token) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            const rightValue = activeState.pop();
            const leftValue = activeState.pop();
            const dataType_opCode = token.split('.');

            let newOperation = new Operation(dataType_opCode[1], dataType_opCode[0], leftValue, rightValue, this.ProgramDetails.lineNumber);
            newOperation = newOperation.execute();
            activeState.push(newOperation);
        }, this);
    }

    handleUnaryOperation(token) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            const leftValue = activeState.pop();
            const dataType_opCode = token.split('.');

            let newOperation = new Operation(dataType_opCode[1], dataType_opCode[0], leftValue, null, this.ProgramDetails.lineNumber);
            newOperation = newOperation.execute();
            activeState.push(newOperation);
        }, this);
    }

    handleGetLocal(token, nextToken) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            const varName = nextToken; // tokens[++currentTokenIndex];
            const valueToPush = activeState.getLocalVariable(varName, this.ProgramDetails.lineNumber);
            activeState.push(valueToPush);
        }, this);
    }

    handleGetGlobal(token, nextToken) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            const varName = nextToken;
            const valueToPush = activeState.getGlobalVariable(varName, this.ProgramDetails.lineNumber);
            activeState.push(valueToPush);
        }, this);
    }

    handleSetLocal(token, nextToken) {

        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {
            const varName = nextToken;
            const newVal = activeState.pop();

            if (index == 0) {
                const newSetAbstraction = new SetAbstraction(varName, newVal, this.ProgramDetails.lineNumber);
                this.addAbstraction(newSetAbstraction);
            }

            activeState.setLocalVariable(varName, newVal, this.ProgramDetails.lineNumber);
        }, this);
    }

    handleTeeLocal(token, nextToken) {
        this.handleSetLocal(token, nextToken);
        this.handleGetLocal(token, nextToken);
    }

    handleTeeGlobal(token, nextToken) {
        this.handleSetGlobal(token, nextToken);
        this.handleGetGlobal(token, nextToken);
    }

    handleSetGlobal(token, nextToken) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {
            const varName = nextToken;
            const newVal = activeState.pop();

            if (index == 0) {
                const newSetAbstraction = new SetAbstraction(varName, newVal, this.ProgramDetails.lineNumber);
                this.addAbstraction(newSetAbstraction);
            }

            activeState.setGlobalVariable(varName, newVal, this.ProgramDetails.lineNumber);
        }, this);
    }

    handleLoad(token, nextToken, secondToken) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            const location = activeState.pop();
            let align = null;
            let offset = null;
            // Handle offset and align
            if (nextToken != null) {
                const splitToken = nextToken.split('=');
                if (splitToken[0] == 'offset') {
                    offset = parseInt(splitToken[1]);
                } else if (splitToken[0] == 'align') {
                    align = parseInt(splitToken[1]);
                }
            }

            if (secondToken != null) {
                const splitToken = secondToken.split('=');
                if (splitToken[0] == 'offset') {
                    offset = parseInt(splitToken[1]);
                } else if (splitToken[0] == 'align') {
                    align = parseInt(splitToken[1]);
                }
            }

            if (align == null) {
                const dataType = token.split('.')[0];
                switch (dataType) {
                    case 'i32':
                    case 'f32':
                        align = 4;
                        break;
                    case 'i64':
                    case 'f64':
                        align = 8;
                        break;
                }
            }


            const newMemoryRef = new MemoryReference(location, align, offset, this.ProgramDetails.lineNumber);

            activeState.push(newMemoryRef);
        }, this);
    }

    handleDrop() {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState) => {
            activeState.pop();
        }, this);
    }

    handleStore(token, nextToken, secondToken) {
        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {
            const valueToStore = activeState.pop();
            const location = activeState.pop();
            const opType = token.split('.')[0];
            const opCode = token.split('.')[1];
            let align = null;
            let offset = null;
            // Handle offset and align
            if (nextToken != null) {
                const splitToken = nextToken.split('=');
                if (splitToken[0] == 'offset') {
                    offset = parseInt(splitToken[1]);
                } else if (splitToken[0] == 'align') {
                    align = parseInt(splitToken[1]);
                }
            }

            if (secondToken != null) {
                const splitToken = secondToken.split('=');
                if (splitToken[0] == 'offset') {
                    offset = parseInt(splitToken[1]);
                } else if (splitToken[0] == 'align') {
                    align = parseInt(splitToken[1]);
                }
            }

            if (align == null) {
                if (opCode == 'store') {
                    switch (opType) {
                        case 'i32':
                        case 'f32':
                            align = 4;
                            break;
                        case 'i64':
                        case 'f64':
                            align = 8;
                            break;
                    }
                } else if (opCode == 'store8') {
                    align = 1;
                } else if (opCode == 'store16') {
                    align = 2;
                } else if (opCode == 'store32') {
                    align = 4;
                }
            }

            if (index == 0) {
                const newStoreAbstraction = new StoreAbstraction(location, valueToStore, align, offset, opType, opCode, this.ProgramDetails.lineNumber);

                let previousAbstraction;

                previousAbstraction = this.CurrentAbstractionList.pop();

                if (previousAbstraction != null && newStoreAbstraction.canMerge(previousAbstraction)) {
                    previousAbstraction = previousAbstraction.merge(newStoreAbstraction, this.ProgramDetails.lineNumber);
                    this.addAbstraction(previousAbstraction);
                } else {
                    if (previousAbstraction != null) {
                        this.addAbstraction(previousAbstraction);
                    }
                    this.addAbstraction(newStoreAbstraction);
                }
            }

            if (location.isIMM()) {
                activeState.storeMemory(location.value, align, valueToStore, this.ProgramDetails.lineNumber);
            } else {
                const newSymbolicMemoryStore = new MemoryReference(location, align, offset, this.ProgramDetails.lineNumber);
                newSymbolicMemoryStore.Value = valueToStore;

                activeState.LinearMemory.SymbolicLocations.push(newSymbolicMemoryStore);
            }
        }, this);
    }

    handleIf() {
        const clonedCurrentStates = lodash.cloneDeep(this.VirtualStates[this.VirtualStates.length - 1]);
        this.VirtualStates.push(clonedCurrentStates);

        this.ContextBreakStack.push(TOKENS.IF_TOKEN);


        const conditionDetails = this.VirtualStates[this.VirtualStates.length - 1][0].pop();
        this.VirtualStates[this.VirtualStates.length - 1][0].push(conditionDetails);

        const newIfAbstraction = new IfAbstraction(conditionDetails, this.ProgramDetails.lineNumber);
        this.moveContextIntoAbstraction(newIfAbstraction);
    }

    handleBrIf() {
        const conditionDetails = this.VirtualStates[this.VirtualStates.length - 1][0].pop();
        this.VirtualStates[this.VirtualStates.length - 1][0].push(conditionDetails);

        const newIfAbstraction = new IfAbstraction(conditionDetails, this.ProgramDetails.lineNumber);
        newIfAbstraction.end(this.ProgramDetails.lineNumber);
        this.addAbstraction(newIfAbstraction);
    }

    handleFor() {
        const newForAbstraction = new ForAbstraction(this.ProgramDetails.lineNumber);
        this.moveContextIntoAbstraction(newForAbstraction);

        this.ContextBreakStack.push(TOKENS.LOOP_TOKEN);
    }

    handleBlock() {
        const newBlockAbstraction = new BlockAbstraction(this.ProgramDetails.lineNumber);
        this.moveContextIntoAbstraction(newBlockAbstraction);

        this.ContextBreakStack.push(TOKENS.block);
    }

    handleEnd() {
        const typeOfEnd = this.ContextBreakStack.pop();
        switch (typeOfEnd) {
            case TOKENS.IF_TOKEN:

                break;
            case TOKENS.LOOP_TOKEN:
                break;
            case TOKENS.block:
                break;
        }

        this.moveContextUp();
    }

    handleElse() {
        this.moveContextToElse();
    }

    handleCall(functionName) {

        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {
            if (index == 0) {
                const argsToCall = [];
                const namedArgs = {};
                const stackToPushBack = [];
                // Lookup param details if any
                const functionType = this.ProgramDetails.getFunctionType(functionName)

                if (functionType != null && functionType.Params != null) {
                    let numOfParams = functionType.Params.length - 1;
                    while (numOfParams >= 0) {
                        const paramName = numOfParams;//this.ProgramDetails.Functions[functionName] == null || this.ProgramDetails.Functions[functionName].Params.length == 0 ? numOfParams : this.ProgramDetails.Functions[functionName].Params[numOfParams].Name;
                        const newParam = activeState.pop();
                        argsToCall.push(newParam);
                        namedArgs[paramName] = newParam;
                        stackToPushBack.push(newParam);

                        numOfParams--;
                    }

                    while (stackToPushBack.length > 0) {
                        activeState.push(stackToPushBack.pop());
                    }

                    var resultVar = null;
                    // if(this.ProgramDetails.lineNumber >= 114725){
                    //     console.log(functionType)
                    // }
                    if(functionType.Result != null){
                        resultVar = new SymbolicValue(functionName + '_result', this.ProgramDetails.lineNumber)
                    }
                    if (resultVar) {
                        activeState.push(resultVar)

                    }
                }

                const newCallAbstraction = new CallAbstraction(functionName, namedArgs, this.ProgramDetails.lineNumber);
                this.addAbstraction(newCallAbstraction);
            }
        }, this);
    }

    handleCallIndirect(type) {
        const newCallIndirectAbstraction = new CallIndirectAbstraction(type, this.ProgramDetails.lineNumber);
        newCallIndirectAbstraction.Paths = Array.from(new Set(this.ProgramDetails.TableFunctions));
        this.CurrentAbstractionList.push(newCallIndirectAbstraction);
        const functionType = this.ProgramDetails.Types[type];

        this.VirtualStates[this.VirtualStates.length - 1].forEach((activeState, index) => {
            if (index == 0) {
                let resultVar = null;
                if(functionType.Result != null){
                    resultVar = new SymbolicValue('call_indirect_' + type + '_result', this.ProgramDetails.lineNumber)
                }
                if (resultVar) {
                    activeState.push(resultVar)
                }
            }
        }, this);
       
    }
}

class Queue {
    // Retrieved from : https://www.geeksforgeeks.org/implementation-queue-javascript/
    // Array is used to implement a Queue
    constructor() {
        this.items = [];
    }

    enqueue(element) {
        // adding element to the queue
        this.items.push(element);
    }

    dequeue() {
        // removing element from the queue
        // returns underflow when called
        // on empty queue
        if (this.isEmpty()) return 'Underflow';
        return this.items.shift();
    }

    isEmpty() {
        // return true if the queue is empty.
        return this.items.length == 0;
    }
}

class GraphNode {
    constructor(abstractionElement) {
        this.Abstraction = abstractionElement;
        this.AdjacentVertices = [];
    }
}

class FunctionGraph {
    constructor() {
        this.AdjacencyList = new Map();
        this.IndexAdjacentList = new Map();
        // this.IndexToAbstractionMapping = new Map();

        this.AbstractionIDsEncountered = [];
        // this.CurrentLastIndex = 0;
        this.FirstVertex = null;
        this.LastVertex = null;
    }

    addVertex(abstraction) {

        if (this.AdjacencyList.get(abstraction) == null) {
            const newgraphNode = new GraphNode(abstraction);
            this.AdjacencyList.set(abstraction, newgraphNode);
        }

        const id = abstraction.ID;

        const abstractionIndex = this.AbstractionIDsEncountered.indexOf(id);

        if (abstractionIndex === -1) { //Node not encountered, add to lists
            this.AbstractionIDsEncountered.push(id);
            const newAbstractionIndex = this.AbstractionIDsEncountered.length - 1;

            this.IndexAdjacentList.set(newAbstractionIndex, []);
        }



        if (this.FirstVertex === null) {
            this.FirstVertex = abstraction;
        }
    }

    addEdge(prevAbstraction, nextAbstraction) {
        this.AdjacencyList.get(prevAbstraction).AdjacentVertices.push(nextAbstraction);

        const previousAbstractionID = prevAbstraction.ID;
        const nextAbstractionID = nextAbstraction.ID;

        const previousAbstractionIndex = this.AbstractionIDsEncountered.indexOf(previousAbstractionID);
        const nextAbstractionIndex = this.AbstractionIDsEncountered.indexOf(nextAbstractionID);

        const indexAdjacencyList = this.IndexAdjacentList.get(previousAbstractionIndex);

        if (!indexAdjacencyList.includes(nextAbstractionIndex)) {
            indexAdjacencyList.push(nextAbstractionIndex);
        }

    }

    makeLastVertex(abstraction) {
        this.LastVertex = abstraction;
    }

    * traverseBFS(startingNode = this.FirstVertex, traverseInner = false) {
        const nodesToVisit = new Queue();
        const visited = new Map();
        const enqueueAdjacentVertices = (node) => {
            let nodeAdjacencyList = this.AdjacencyList.get(node);
            if (nodeAdjacencyList == null) {
                return;
            }
            nodeAdjacencyList = nodeAdjacencyList.AdjacentVertices;
            for (const abstr of nodeAdjacencyList) {
                if (visited.get(abstr) !== true) {
                    nodesToVisit.enqueue(abstr);
                    visited.set(abstr, true);
                }
            }
        };

        const traverseInnerAbstractions = function* (abstr) {
            if (abstr.InnerAbstractions.length > 0) {
                for (const innerAbs of abstr.InnerAbstractions) {
                    yield innerAbs;
                    yield* traverseInnerAbstractions(innerAbs);
                }
            }

            if (abstr.ElseAbstractions != null && abstr.ElseAbstractions.length > 0) {
                for (const innerAbs of abstr.ElseAbstractions) {
                    yield innerAbs;
                    yield* traverseInnerAbstractions(innerAbs);
                }
            }
        };

        visited.set(startingNode, true);
        nodesToVisit.enqueue(startingNode);

        if (startingNode.ParentAbstraction != null) {
            if (
                startingNode.ParentAbstraction.AbstractionType != 'IF' &&
                startingNode.ParentAbstraction.AbstractionType !== 'MEMCPY' &&
                startingNode.ParentAbstraction.AbstractionType !== 'CALL'
            ) {
                const abstrIndexInParent = startingNode.ParentAbstraction.InnerAbstractions.indexOf(startingNode);

                for (let i = abstrIndexInParent; i < startingNode.ParentAbstraction.InnerAbstractions.length; i++) {
                    const abstr = startingNode.ParentAbstraction.InnerAbstractions[i];
                    if (abstr == startingNode) continue;
                    yield abstr;
                }
                enqueueAdjacentVertices(startingNode.ParentAbstraction);
            }
        }

        while (!nodesToVisit.isEmpty()) {
            const abstraction = nodesToVisit.dequeue();

            yield abstraction;

            if (traverseInner == true) {
                if (abstraction.AbstractionType == 'FOR' || abstraction.AbstractionType == 'BLOCK') {
                    yield* traverseInnerAbstractions(abstraction);
                }
            }
            enqueueAdjacentVertices(abstraction);
        }
    }

    // * traverseDFS(startingNode = this.FirstVertex, traverseInner = false) {
    //   const nodesToVisit = [];
    //   const visited = new Map();
    //   const enqueueAdjacentVertices = (node) => {
    //     let nodeAdjacencyList = this.AdjacencyList.get(node);
    //     if (nodeAdjacencyList == null) {
    //       return;
    //     }
    //     nodeAdjacencyList = nodeAdjacencyList.AdjacentVertices;
    //     for (const abstr of nodeAdjacencyList) {
    //       if (visited.get(abstr) !== true) {
    //         nodesToVisit.push(abstr);
    //         visited.set(abstr, true);
    //       }
    //     }
    //   };

    //   const traverseInnerAbstractions = function* (abstr) {
    //     if (abstr.InnerAbstractions.length > 0) {
    //       for (const innerAbs of abstr.InnerAbstractions) {
    //         yield innerAbs;
    //         yield* traverseInnerAbstractions(innerAbs);
    //       }
    //     }

    //     if (abstr.ElseAbstractions != null && abstr.ElseAbstractions.length > 0) {
    //       for (const innerAbs of abstr.ElseAbstractions) {
    //         yield innerAbs;
    //         yield* traverseInnerAbstractions(innerAbs);
    //       }
    //     }
    //   };

    //   visited.set(startingNode, true);
    //   nodesToVisit.push(startingNode);

    //   if (startingNode.ParentAbstraction != null) {
    //     if (
    //       startingNode.ParentAbstraction.AbstractionType != 'IF'
    //       && startingNode.ParentAbstraction.AbstractionType !== 'MEMCPY'
    //       && startingNode.ParentAbstraction.AbstractionType !== 'CALL'
    //     ) {
    //       const abstrIndexInParent = startingNode.ParentAbstraction.InnerAbstractions.indexOf(startingNode);

    //       for (let i = abstrIndexInParent; i < startingNode.ParentAbstraction.InnerAbstractions.length; i++) {
    //         const abstr = startingNode.ParentAbstraction.InnerAbstractions[i];
    //         if (abstr == startingNode) continue;
    //         yield abstr;
    //       }
    //       enqueueAdjacentVertices(startingNode.ParentAbstraction);
    //     }
    //   }

    //   while (nodesToVisit.length > 0) {
    //     const abstraction = nodesToVisit.pop();

    //     yield abstraction;

    //     if (traverseInner == true) {
    //       if (abstraction.AbstractionType == 'FOR' || abstraction.AbstractionType == 'BLOCK') {
    //         yield* traverseInnerAbstractions(abstraction);
    //       }
    //     }
    //     enqueueAdjacentVertices(abstraction);
    //   }
    // }


}

class FullProgramGraph {
    constructor(programDetails) {
        this.ProgramDetails = programDetails;
    }

    * traverseBFS(startingNode = this.FirstVertex, traverseInner = false) {
        const nodesToVisit = new Queue();
        const visited = new Map();

        const enqueueAdjacentVertices = (node) => {
            let nodeAdjacencyList = this.AdjacencyList.get(node);
            if (nodeAdjacencyList == null) {
                return;
            }
            nodeAdjacencyList = nodeAdjacencyList.AdjacentVertices;
            for (const abstr of nodeAdjacencyList) {
                if (visited.get(abstr) !== true) {
                    nodesToVisit.enqueue(abstr);
                    visited.set(abstr, true);
                }
            }
        };

        const traverseInnerAbstractions = function* (abstr) {
            if (abstr.InnerAbstractions.length > 0) {
                for (const innerAbs of abstr.InnerAbstractions) {
                    yield innerAbs;
                    yield* traverseInnerAbstractions(innerAbs);
                }
            }

            if (abstr.ElseAbstractions != null && abstr.ElseAbstractions.length > 0) {
                for (const innerAbs of abstr.ElseAbstractions) {
                    yield innerAbs;
                    yield* traverseInnerAbstractions(innerAbs);
                }
            }
        };

        visited.set(startingNode, true);
        nodesToVisit.enqueue(startingNode);

        if (startingNode.ParentAbstraction != null) {
            if (
                startingNode.ParentAbstraction.AbstractionType != 'IF' &&
                startingNode.ParentAbstraction.AbstractionType !== 'MEMCPY' &&
                startingNode.ParentAbstraction.AbstractionType !== 'CALL'
            ) {
                const abstrIndexInParent = startingNode.ParentAbstraction.InnerAbstractions.indexOf(startingNode);

                for (let i = abstrIndexInParent; i < startingNode.ParentAbstraction.InnerAbstractions.length; i++) {
                    const abstr = startingNode.ParentAbstraction.InnerAbstractions[i];
                    if (abstr == startingNode) continue;
                    yield abstr;
                }
                enqueueAdjacentVertices(startingNode.ParentAbstraction);
            }
        }

        while (!nodesToVisit.isEmpty()) {
            const abstraction = nodesToVisit.dequeue();

            yield abstraction;

            if (traverseInner == true) {
                if (abstraction.AbstractionType == 'FOR' || abstraction.AbstractionType == 'BLOCK') {
                    yield* traverseInnerAbstractions(abstraction);
                }
            }
            enqueueAdjacentVertices(abstraction);
        }
    }

    makeFullGraph(startingFunctionName) {
        const startingList = this.ProgramDetails.Functions[startingFunctionName].Simulator.Abstractions
        const fullGraph = this.makeGraphFromAbstractionList(startingList);
        return fullGraph;
    }

    makeGraphFromAbstractionList(abstractionList, passedGraph = null, returnAbstraction = null, callDepth = 0) {
        const abstractionGraph = passedGraph || new FunctionGraph();

        let previousNode = null;
        for (const abstraction of abstractionList) {
            if (abstractionList.length == 1) {
                previousNode = abstraction;

                abstractionGraph.addVertex(abstraction);
            } else {
                if (previousNode == null) {
                    abstractionGraph.addVertex(abstraction);
                    previousNode = abstraction;
                    continue;
                }

                abstractionGraph.addVertex(abstraction);

                if (Array.isArray(previousNode)) {
                    previousNode.forEach((abstr) => {
                        abstractionGraph.addEdge(abstr, abstraction);
                    });
                } else {
                    abstractionGraph.addEdge(previousNode, abstraction);
                }

                previousNode = abstraction;
            }

            if (abstraction.AbstractionType == 'IF') {

                let newPreviousNodeList = [];
                const ifSubGraph = this.makeGraphFromAbstractionList(abstraction.InnerAbstractions, abstractionGraph, true, callDepth);
                if (ifSubGraph != null) {
                    if (Array.isArray(ifSubGraph)) {
                        newPreviousNodeList = newPreviousNodeList.concat(ifSubGraph);
                    } else {
                        newPreviousNodeList.push(ifSubGraph);
                    }
                }
                const elseSubGraph = this.makeGraphFromAbstractionList(abstraction.ElseAbstractions, abstractionGraph, true, callDepth);
                if (elseSubGraph != null) {
                    if (Array.isArray(elseSubGraph)) {
                        newPreviousNodeList = newPreviousNodeList.concat(elseSubGraph);
                    } else {
                        newPreviousNodeList.push(elseSubGraph);
                    }
                }

                let firstInnerAbstraction = null;
                if (abstraction.InnerAbstractions.length > 0) {
                    firstInnerAbstraction = abstraction.InnerAbstractions[0];
                }
                let firstElseAbstraction = null;
                if (abstraction.ElseAbstractions.length > 0) {
                    firstElseAbstraction = abstraction.ElseAbstractions[0];
                }

                if (Array.isArray(previousNode)) {
                    previousNode.forEach((abstr) => {
                        if (firstInnerAbstraction != null) {
                            abstractionGraph.addEdge(abstr, firstInnerAbstraction);
                        }
                        if (firstElseAbstraction != null) {
                            abstractionGraph.addEdge(abstr, firstElseAbstraction);
                        }
                    });
                } else {
                    if (firstInnerAbstraction != null) {
                        abstractionGraph.addEdge(previousNode, firstInnerAbstraction);
                    }
                    if (firstElseAbstraction != null) {
                        abstractionGraph.addEdge(previousNode, firstElseAbstraction);
                    }
                }

                if (newPreviousNodeList.length == 1) {
                    previousNode = newPreviousNodeList[0];
                } else if (newPreviousNodeList.length > 1) {
                    previousNode = newPreviousNodeList;
                }
                continue;
            } else if (abstraction.AbstractionType == 'FOR') {
                if (abstraction.InnerAbstractions.length > 0) {
                    const forSubGraph = this.makeGraphFromAbstractionList(abstraction.InnerAbstractions, abstractionGraph, true, callDepth);

                    const firstInnerAbstraction = abstraction.InnerAbstractions[0];

                    if (Array.isArray(previousNode)) {
                        previousNode.forEach((abstr) => {
                            abstractionGraph.addEdge(abstr, firstInnerAbstraction);
                        });
                    } else {
                        abstractionGraph.addEdge(previousNode, firstInnerAbstraction);
                    }

                    if (forSubGraph != null) {
                        if (Array.isArray(forSubGraph)) {
                            forSubGraph.forEach((abstr) => {
                                abstractionGraph.addEdge(abstr, abstraction);
                            });
                        } else {
                            abstractionGraph.addEdge(forSubGraph, abstraction);
                        }
                    }


                }
            } else if (abstraction.AbstractionType == 'CALL') {

                if(callDepth < MAX_CALL_DEPTH){
                    const calledFunctionName = abstraction.FunctionName;

                    if (this.ProgramDetails.Functions[calledFunctionName] != null) {
                        const callAbstractions = this.ProgramDetails.Functions[calledFunctionName].Simulator.Abstractions;
                        if (callAbstractions.length > 0) {
                            const callSubGraph = this.makeGraphFromAbstractionList(callAbstractions, abstractionGraph, true, callDepth + 1);
                            if (callSubGraph != null) {
                                const firstInnerAbstraction = callAbstractions[0];
                                abstractionGraph.addEdge(abstraction, firstInnerAbstraction);
                                // if (Array.isArray(callSubGraph)) {
                                //     newPreviousNodeList = newPreviousNodeList.concat(callSubGraph);
                                // } else {
                                //     newPreviousNodeList.push(callSubGraph);
                                // }
    
                                // if (newPreviousNodeList.length == 1) {
                                //     previousNode = newPreviousNodeList[0];
                                // } else if (newPreviousNodeList.length > 1) {
                                //     previousNode = newPreviousNodeList;
                                // }
                            }
                        }
                    }
                }
                



            } else if (abstraction.AbstractionType == 'CALL_INDIRECT') {

                if(callDepth < MAX_CALL_DEPTH){
                    const functionPaths = abstraction.Paths;
                    for (const calledFunctionName of functionPaths) {
                        const callAbstractions = this.ProgramDetails.Functions[calledFunctionName].Simulator.Abstractions;
                        if (callAbstractions.length > 0) {
                            const callSubGraph = this.makeGraphFromAbstractionList(callAbstractions, abstractionGraph, true, callDepth + 1);
                            if (callSubGraph != null) {
                                const firstInnerAbstraction = callAbstractions[0];
                                abstractionGraph.addEdge(abstraction, firstInnerAbstraction);
                                // if (Array.isArray(callSubGraph)) {
                                //     newPreviousNodeList = newPreviousNodeList.concat(callSubGraph);
                                // } else {
                                //     newPreviousNodeList.push(callSubGraph);
                                // }
    
                                // if (newPreviousNodeList.length == 1) {
                                //     previousNode = newPreviousNodeList[0];
                                // } else if (newPreviousNodeList.length > 1) {
                                //     previousNode = newPreviousNodeList;
                                // }
                            }
                        }
                    }
                }

                // let newPreviousNodes = [];
                // functionPaths.forEach((path) => {
                //     if (path != null && path.Abstractions != null && path.Abstractions.length > 0) {
                //         const pathLastNode = this.makeGraphFromAbstractionList(path, abstractionGraph, true);
                //         if (pathLastNode != null) {
                //             if (Array.isArray(pathLastNode)) {
                //                 newPreviousNodes = newPreviousNodes.concat(pathLastNode);
                //             } else {
                //                 newPreviousNodes.push(pathLastNode);
                //             }
                //         }

                //         abstractionGraph.addEdge(abstraction, path.Abstractions[0]);
                //     }
                // });
                // previousNode = newPreviousNodes;
            }
        }

        if (returnAbstraction == true) {
            return previousNode;
        }

        abstractionGraph.makeLastVertex(previousNode);

        return abstractionGraph;
    }


}

class ProgramDetailsModel {
    constructor(filename, databaseConnection, originalUploadFilename = '', crawlResults = null) {

        const fullPath = filename;
        const directory = path.dirname(fullPath);
        const wasmFilename = path.basename(fullPath);

        this.AssociatedCrawlResults = crawlResults;
        this.Filename = wasmFilename;
        this.File = filename;
        this.FileHash = null;
        this.OriginalUploadFilename = originalUploadFilename || filename;
        this.WasmFileSize = fs.statSync(filename).size;;
        this.WatFileSize = null;
        this.WebAssemblyType = null;
        this.NumberOfFunctions = 0;
        this.Functions = {};
        this.Types = {};
        this.TableFunctions = [];
        this.Imports = [];
        this.Exports = [];
        this.DataSections = [];

        this.currentFunction = null;
        this.contextBreakStack = [];
        this.lineNumber = 0;
        this.database = databaseConnection;
    }

    postProcessAllFunctions() {
        for (const functionName of Object.keys(this.Functions)) {
            this.LinkFunctionCalls(this.Functions[functionName].Simulator.Abstractions);
        }
    }

    getFunctionType(functionName){


        //First check internally defined
        let functionType = null;
        if(this.Functions[functionName]){
            functionType = this.Functions[functionName].FunctionType;
            return this.Types[functionType]
        }
        
        //If not there, check Imports
        for(const imp of this.Imports){
            if(imp.ImportedName == functionName){
                functionType = imp.FunctionType
                return functionType;
            }
        }

        
    }


    onLineReadForDetails(line) {
        let tokens = line.split(/\s+/).map(this.cleanToken).filter(token => token != '');
        // Clean comments
        let markCommentIndex = -1;
        for (let k = 0; k < tokens.length; k++) {
            if (tokens[k].includes(';;')) {
                // this and every token after is a comment
                markCommentIndex = k;
                break;
            }
        }

        if (markCommentIndex !== -1) {
            tokens = tokens.slice(0, markCommentIndex);
        }

        if (this.currentFunction != null) {
            this.Functions[this.currentFunction].EndingLineNumber += 1;
        }

        let currentTokenIndex = 0;
        while (currentTokenIndex < tokens.length) {
            const token = tokens[currentTokenIndex];
  
            if (token == TOKENS.DATA_TOKEN && tokens[currentTokenIndex + 2] == TOKENS.i32_const) {
                const startOffset = tokens[currentTokenIndex + 2];
                const payload = tokens.slice(4).join('');
                const dataSection = new DataSection(startOffset, payload);
                this.DataSections.push(dataSection);
            }

            if (token == TOKENS.IMPORT_TOKEN && tokens.includes(TOKENS.FUNCTION_TOKEN)) {
                let funcTokenIndex = tokens.indexOf(TOKENS.FUNCTION_TOKEN);
                let typeTokenIndex = tokens.indexOf(TOKENS.FUNCTION_TYPE_TOKEN);
                const importName = tokens.slice(currentTokenIndex + 1, funcTokenIndex).join(' ');
                const importType = TOKENS.FUNCTION_TOKEN;
                const importFunctionType = this.Types[tokens.slice(typeTokenIndex + 1).join('')];
                const importedName = tokens[funcTokenIndex + 1];
                const importDetails = new ImportDetails(importName, importType);
                importDetails.FunctionType = importFunctionType;
                importDetails.ImportedName = importedName;

                this.Imports.push(importDetails);
            }

            if (token == TOKENS.EXPORT_TOKEN && tokens.includes(TOKENS.FUNCTION_TOKEN)) {
                let funcTokenIndex = tokens.indexOf(TOKENS.FUNCTION_TOKEN);
                const exportName = tokens.slice(currentTokenIndex + 1, funcTokenIndex).join(' ');
                const exportType = TOKENS.FUNCTION_TOKEN;
                const exportedName = tokens.slice(funcTokenIndex + 1).join('');
                const exportDetails = new ExportDetails(exportName, exportType);
                exportDetails.ExportSource = exportedName;

                this.Exports.push(exportDetails);
            }

            if (token == TOKENS.FUNCTION_TOKEN && tokens[currentTokenIndex + 2] == TOKENS.FUNCTION_TYPE_TOKEN && !tokens.includes(TOKENS.IMPORT_TOKEN)) {
                const functionName = tokens[currentTokenIndex + 1];
                const functionType = tokens[currentTokenIndex + 3];

                // if (this.currentFunction != null && this.Functions[this.currentFunction] != null) {
                //     //Update the line numbers
                //     const prevFunction = this.Functions[this.currentFunction];
                //     prevFunction.EndingLineNumber = this.lineNumber - 1;
                //     prevFunction.LinesOfCode = prevFunction.EndingLineNumber - prevFunction.StartingLineNumber;
                // }

                // Update current function context
                this.currentFunction = functionName;
                // Get the function details
                this.NumberOfFunctions += 1;
                const functionDetails = new FunctionDetails(functionName, this);
                functionDetails.StartingLineNumber = this.lineNumber;
                functionDetails.EndingLineNumber = this.lineNumber;
                functionDetails.FunctionType = functionType;
                for (let i = 3; i < tokens.length; i++) {
                    // Get function parameter details
                    if (tokens[i] == TOKENS.FUNCTION_PARAM_TOKEN) {
                        functionDetails.Params.push({
                            Name: tokens[i + 1],
                            Type: tokens[i + 2]
                        }); // get rid of trailing parenthesis
                    }

                    if (tokens[i] == TOKENS.FUNCTION_RESULT_TOKEN) {
                        functionDetails.HasResult = true;
                        functionDetails.ResultType = tokens[i + 1];
                    }
                }
                if (this.Functions[functionName] == null) {
                    this.Functions[functionName] = functionDetails;
                } else {
                    this.Functions[functionName].Params = functionDetails.Params;
                    this.Functions[functionName].NumberOfLoops = functionDetails.NumberOfLoops;
                    this.Functions[functionName].NumberOfIfs = functionDetails.NumberOfIfs;
                    this.Functions[functionName].Loops = functionDetails.Loops;
                    this.Functions[functionName].LoopLines = functionDetails.LoopLines;
                    this.Functions[functionName].Ifs = functionDetails.Ifs;
                    this.Functions[functionName].HasResult = functionDetails.HasResult;
                    this.Functions[functionName].ResultType = functionDetails.ResultType;
                }

                return;
            }

            if (token == TOKENS.FUNCTION_TOKEN && tokens[currentTokenIndex + 1] == TOKENS.EXPORT_TOKEN) {
                const functionName = tokens[currentTokenIndex + 1];
                // Update current function context
                this.currentFunction = functionName;
                // Get the function details
                this.NumberOfFunctions += 1;
                const functionDetails = new FunctionDetails(functionName, this);

                if (this.Functions[functionName] == null) {
                    this.Functions[functionName] = functionDetails;
                } else {
                    this.Functions[functionName].Params = functionDetails.Params;
                    this.Functions[functionName].NumberOfLoops = functionDetails.NumberOfLoops;
                    this.Functions[functionName].NumberOfIfs = functionDetails.NumberOfIfs;
                    this.Functions[functionName].Loops = functionDetails.Loops;
                    this.Functions[functionName].LoopLines = functionDetails.LoopLines;
                    this.Functions[functionName].Ifs = functionDetails.Ifs;
                }

                return;
            }

            if (token == TOKENS.FUNCTION_TYPE_TOKEN && currentTokenIndex == 0) {
                const typeName = tokens[currentTokenIndex + 1];
                const typeDetails = new TypeDetails(typeName);

                let seenParamKeyword = false;
                let seenResultKeyword = false;
                for (let i = currentTokenIndex + 2; i < tokens.length; i++) {
                    if (tokens[i] == TOKENS.FUNCTION_PARAM_TOKEN) {
                        seenParamKeyword = true;
                        continue;
                    }

                    if (tokens[i] == TOKENS.FUNCTION_RESULT_TOKEN) {
                        seenParamKeyword = false;
                        seenResultKeyword = true;
                        continue;
                    }

                    if (seenParamKeyword) {
                        typeDetails.Params.push(tokens[i]);
                    }

                    if (seenResultKeyword) {
                        typeDetails.Result = tokens[i];

                    }
                }

                this.Types[typeName] = typeDetails;
            }

            if (token == TOKENS.elemToken) {
                let globalInstructionIndex = tokens.indexOf(TOKENS.get_global);
                if (globalInstructionIndex == -1) {
                    globalInstructionIndex = tokens.indexOf(TOKENS.get_global_alt);
                } else {
                    globalInstructionIndex += 2;
                }
                if (globalInstructionIndex == -1) {
                    globalInstructionIndex = currentTokenIndex + 3;
                } else {
                    globalInstructionIndex += 2;
                }

                for (let i = globalInstructionIndex; i < tokens.length; i++) {
                    this.TableFunctions.push(tokens[i]);
                }
            }

            if (token == '') {
                currentTokenIndex++;
                continue;
            }

            switch (token) {
                case TOKENS.call: {
                    const functionCallName = tokens[++currentTokenIndex]; //this.cleanToken(tokens[++currentTokenIndex]);
                    if (this.Functions[functionCallName] == null) {
                        // this.Functions[functionCallName] = new FunctionDetails(functionCallName);
                        break;
                    }
                    this.Functions[this.currentFunction].Calls.push({
                        Function: this.Functions[functionCallName],
                        Line: this.lineNumber,
                        Args: [],
                    });
                }
                break;
            }
            if (token == TOKENS.CALL_INDIRECT_TOKEN) {
                this.Functions[this.currentFunction].Calls.push({
                    Function: {
                        Name: '<call_indirect>',
                        Calls: []
                    },
                    Line: this.lineNumber,
                    Args: [],
                });
            }

            // Look for the start of loops
            if (token == TOKENS.LOOP_TOKEN) {
                this.contextBreakStack.push({
                    type: TOKENS.LOOP_TOKEN,
                    line: this.lineNumber
                });
                this.Functions[this.currentFunction].LoopLines.push(this.lineNumber);
            }

            // Look for the start of if statements
            if (token == TOKENS.IF_TOKEN) {
                this.contextBreakStack.push({
                    type: TOKENS.IF_TOKEN,
                    line: this.lineNumber
                });
            }

            // Look for the end of a loop or if statement
            if (token == TOKENS.END_TOKEN) {
                if (this.contextBreakStack.length > 0) {
                    const lastToken = this.contextBreakStack.pop();

                    if (lastToken.type == TOKENS.LOOP_TOKEN) {
                        this.Functions[this.currentFunction].NumberOfLoops += 1;
                    } else if (lastToken.type == TOKENS.IF_TOKEN) {
                        this.Functions[this.currentFunction].NumberOfIfs += 1;
                        this.Functions[this.currentFunction].Ifs.push({
                            type: TOKENS.IF_TOKEN,
                            start: lastToken.line,
                            end: this.lineNumber,
                        });
                    }
                }


            }
            currentTokenIndex += 1;
        }

    }

    onLineReadForAbstraction(line) {
        let tokens = line.split(/\s+/).map(this.cleanToken);
        let Simulator = null;
        if (this.currentFunction != null && this.Functions[this.currentFunction] != null) {
            Simulator = this.Functions[this.currentFunction].Simulator;
        }

        let currentTokenIndex = 0;
        try {
            while (currentTokenIndex < tokens.length) {
                const token = tokens[currentTokenIndex];
                // console.log(this.currentFunction, token)

                // /////////////////////////////  PREPROCESSING STUFF /////////////////////////////////
                if (token == '') {
                    currentTokenIndex++;
                    continue;
                }

                if (token == TOKENS.FUNCTION_TOKEN && tokens[currentTokenIndex + 2] == TOKENS.FUNCTION_TYPE_TOKEN) {
                    const functionName = tokens[currentTokenIndex + 1];

                    // Update current function context
                    this.currentFunction = functionName;
                    if (this.Functions[this.currentFunction] != null) {
                        Simulator = this.Functions[this.currentFunction].Simulator;
                        const functionType = this.getFunctionType(this.currentFunction)
                        Simulator.handleInitialDefinition(functionType, this.lineNumber);
                    }
                }

                // /////////////////////////////  PARSING FUNCTIONALITY /////////////////////////////////

                switch (token) {
                    case TOKENS.call: {
                        const functionCallName = this.cleanToken(tokens[++currentTokenIndex]);
                        Simulator.handleCall(functionCallName);
                    }
                    break;
                case TOKENS.call_indirect: {
                    let functionType = null;
                    if (tokens[currentTokenIndex + 2] != null) {
                        functionType = tokens[currentTokenIndex + 2];
                    }
                    Simulator.handleCallIndirect(functionType);
                }
                break;
                case TOKENS.get_global:
                case TOKENS.get_global_alt: {
                    const varName = tokens[++currentTokenIndex];

                    Simulator.handleGetGlobal(token, varName);
                }
                break;
                case TOKENS.set_global:
                case TOKENS.set_global_alt: {
                    const varName = tokens[++currentTokenIndex];

                    Simulator.handleSetGlobal(token, varName);
                }
                break;
                case TOKENS.get_local:
                case TOKENS.get_local_alt: {
                    const varName = tokens[++currentTokenIndex];

                    Simulator.handleGetLocal(token, varName);
                }
                break;
                case TOKENS.set_local:
                case TOKENS.set_local_alt: {
                    const varName = tokens[++currentTokenIndex];

                    Simulator.handleSetLocal(token, varName);
                }
                break;
                case TOKENS.tee_local:
                case TOKENS.tee_local_alt: {
                    const varName = tokens[++currentTokenIndex];

                    Simulator.handleTeeLocal(token, varName);
                }
                break;
                case TOKENS.i32_load8_s:
                case TOKENS.i32_load8_u:
                case TOKENS.i32_load16_s:
                case TOKENS.i32_load16_u:
                case TOKENS.i32_load:
                case TOKENS.i64_load8_s:
                case TOKENS.i64_load8_u:
                case TOKENS.i64_load16_s:
                case TOKENS.i64_load16_u:
                case TOKENS.i64_load32_s:
                case TOKENS.i64_load32_u:
                case TOKENS.i64_load:
                case TOKENS.f32_load:
                case TOKENS.f64_load: {
                    const secondToken = ++currentTokenIndex < tokens.length ? tokens[currentTokenIndex] : null;
                    const thirdToken = ++currentTokenIndex < tokens.length ? tokens[currentTokenIndex] : null;
                    Simulator.handleLoad(token, secondToken, thirdToken);
                }
                break;
                case TOKENS.i32_store8:
                case TOKENS.i32_store16:
                case TOKENS.i32_store:
                case TOKENS.i64_store8:
                case TOKENS.i64_store16:
                case TOKENS.i64_store32:
                case TOKENS.i64_store:
                case TOKENS.f32_store:
                case TOKENS.f64_store: {
                    const secondToken = ++currentTokenIndex < tokens.length ? tokens[currentTokenIndex] : null;
                    const thirdToken = ++currentTokenIndex < tokens.length ? tokens[currentTokenIndex] : null;
                    Simulator.handleStore(token, secondToken, thirdToken);
                }
                break;
                case TOKENS.i32_const:
                case TOKENS.i64_const:
                case TOKENS.f32_const:
                case TOKENS.f64_const: {
                    const dataType = token.split('.')[0];
                    const val = tokens[++currentTokenIndex];

                    Simulator.handleConst(val, dataType);
                }
                break;
                // Binary Operators
                case TOKENS.i32_add:
                case TOKENS.i32_sub:
                case TOKENS.i32_mul:
                case TOKENS.i32_div_s:
                case TOKENS.i32_div_u:
                case TOKENS.i32_rem_s:
                case TOKENS.i32_rem_u:
                case TOKENS.i32_and:
                case TOKENS.i32_or:
                case TOKENS.i32_xor:
                case TOKENS.i32_shl:
                case TOKENS.i32_shr_u:
                case TOKENS.i32_shr_s:
                case TOKENS.i32_rotl:
                case TOKENS.i32_rotr:
                case TOKENS.i32_eq:
                case TOKENS.i32_ne:
                case TOKENS.i32_lt_s:
                case TOKENS.i32_le_s:
                case TOKENS.i32_lt_u:
                case TOKENS.i32_le_u:
                case TOKENS.i32_gt_s:
                case TOKENS.i32_ge_s:
                case TOKENS.i32_gt_u:
                case TOKENS.i32_ge_u:
                case TOKENS.i64_add:
                case TOKENS.i64_sub:
                case TOKENS.i64_mul:
                case TOKENS.i64_div_s:
                case TOKENS.i64_div_u:
                case TOKENS.i64_rem_s:
                case TOKENS.i64_rem_u:
                case TOKENS.i64_and:
                case TOKENS.i64_or:
                case TOKENS.i64_xor:
                case TOKENS.i64_shl:
                case TOKENS.i64_shr_u:
                case TOKENS.i64_shr_s:
                case TOKENS.i64_rotl:
                case TOKENS.i64_rotr:
                case TOKENS.i64_eq:
                case TOKENS.i64_ne:
                case TOKENS.i64_lt_s:
                case TOKENS.i64_le_s:
                case TOKENS.i64_lt_u:
                case TOKENS.i64_le_u:
                case TOKENS.i64_gt_s:
                case TOKENS.i64_ge_s:
                case TOKENS.i64_gt_u:
                case TOKENS.i64_ge_u:
                case TOKENS.f32_add:
                case TOKENS.f32_sub:
                case TOKENS.f32_mul:
                case TOKENS.f32_div:
                case TOKENS.f32_eq:
                case TOKENS.f32_ne:
                case TOKENS.f32_lt:
                case TOKENS.f32_le:
                case TOKENS.f32_gt:
                case TOKENS.f32_ge:
                case TOKENS.f32_min:
                case TOKENS.f32_max:
                case TOKENS.f64_add:
                case TOKENS.f64_sub:
                case TOKENS.f64_mul:
                case TOKENS.f64_div:
                case TOKENS.f64_eq:
                case TOKENS.f64_ne:
                case TOKENS.f64_lt:
                case TOKENS.f64_le:
                case TOKENS.f64_gt:
                case TOKENS.f64_ge:
                case TOKENS.f64_min:
                case TOKENS.f64_max: {
                    Simulator.handleBinaryOperation(token);
                }
                break;
                // Unary Operators
                case TOKENS.i32_clz:
                case TOKENS.i32_ctz:
                case TOKENS.i32_popcnt:
                case TOKENS.i32_eqz:
                case TOKENS.i64_clz:
                case TOKENS.i64_ctz:
                case TOKENS.i64_popcnt:
                case TOKENS.i64_eqz:
                case TOKENS.f32_abs:
                case TOKENS.f32_neg:
                case TOKENS.f32_copysign:
                case TOKENS.f32_ceil:
                case TOKENS.f32_floor:
                case TOKENS.f32_trunc:
                case TOKENS.f32_nearest:
                case TOKENS.f32_sqrt:
                case TOKENS.f64_abs:
                case TOKENS.f64_neg:
                case TOKENS.f64_copysign:
                case TOKENS.f64_ceil:
                case TOKENS.f64_floor:
                case TOKENS.f64_trunc:
                case TOKENS.f64_sqrt:
                case TOKENS.f64_nearest:
                case TOKENS.i32_wrap_i64:
                case TOKENS.i32_trunc_s_f32:
                case TOKENS.i32_trunc_s_f64:
                case TOKENS.i32_trunc_u_f32:
                case TOKENS.i32_trunc_u_f64:
                case TOKENS.i32_reinterpret_f32:
                case TOKENS.i64_extend_s_i32:
                case TOKENS.i64_extend_u_i32:
                case TOKENS.i64_trunc_s_f32:
                case TOKENS.i64_trunc_s_f64:
                case TOKENS.i64_trunc_u_f32:
                case TOKENS.i64_trunc_u_f64:
                case TOKENS.i64_reinterpret_f64:
                case TOKENS.f32_demote_f64:
                case TOKENS.f32_convert_s_i32:
                case TOKENS.f32_convert_s_i64:
                case TOKENS.f32_convert_u_i32:
                case TOKENS.f32_convert_u_i64:
                case TOKENS.f32_reinterpret_i32:
                case TOKENS.f64_promote_f32:
                case TOKENS.f64_convert_s_i32:
                case TOKENS.f64_convert_s_i64:
                case TOKENS.f64_convert_u_i32:
                case TOKENS.f64_convert_u_i64:
                case TOKENS.f64_reinterpret_i64:
                    Simulator.handleUnaryOperation(token);
                    break;
                case TOKENS.IF_TOKEN:
                    Simulator.handleIf();
                    break;
                case TOKENS.LOOP_TOKEN:
                    Simulator.handleFor();
                    break;
                case TOKENS.END_TOKEN:
                    Simulator.handleEnd();
                    break;
                case TOKENS.drop:
                    Simulator.handleDrop();
                    break;
                case TOKENS.ELSE_TOKEN:
                    Simulator.handleElse();
                    break;
                case TOKENS.block:
                    Simulator.handleBlock();
                    break;
                case TOKENS.br_if:
                    Simulator.handleBrIf();
                    break;
                }

                currentTokenIndex += 1;
            }
        } catch (error) {
            console.error(error);

            console.log(JSON.stringify({
                error: true,
                errorDetails: error
            }));
        }
    }


    makeEdgeList(graph) {
        const edgeList = {};

        const traverseObject = graph.traverseBFS(graph.FirstVertex, true);
        let nextVal = traverseObject.next();
        let currentNodeIndexNumber = 0;
        let previousNodeIndexNumber;
        const nodeIDsSeen = [];
        while (nextVal.value) {
            const node = nextVal.value;
            currentNodeIndexNumber = nodeIDsSeen.indexOf(node.ID);

            if (currentNodeIndexNumber == -1) {
                nodeIDsSeen.push(node.ID);
                currentNodeIndexNumber = nodeIDsSeen.length - 1;
            }

            if (previousNodeIndexNumber != null) {
                if (edgeList[previousNodeIndexNumber] == undefined) {
                    edgeList[previousNodeIndexNumber] = [];
                }
                edgeList[previousNodeIndexNumber].push(currentNodeIndexNumber);
            }

            previousNodeIndexNumber = currentNodeIndexNumber;
            nextVal = traverseObject.next();

        }

        return edgeList;
    }

    onLineReadForDetailsEnd() {
        let edgeListObject = null;
        try {
            // this.postProcessAllFunctions();
        } catch (error) {
            console.error(error);
            console.log(JSON.stringify({
                error: true,
                errorDetails: error
            }));
        }

        let functionOfInterest = null;
        const exportedFunctions = this.Exports;
        const actualProgramFunctions = Object.keys(this.Functions);

        if (this.AssociatedCrawlResults != null && this.AssociatedCrawlResults.graphDetails.window != null) {
            let crawledfunctionNames = Object.keys(this.AssociatedCrawlResults.graphDetails.window.exportCalls);
            for (const worker of this.AssociatedCrawlResults.graphDetails.workers) {
                const workerCalls = Object.keys(worker.exportCalls)
                if (workerCalls.length > 0) {
                    crawledfunctionNames.push(...workerCalls);
                }
            }

            for (const functionName of crawledfunctionNames) {
                if (actualProgramFunctions.includes(functionName)) {
                    functionOfInterest = functionName;
                    break;
                }
            }

            for (const exp of exportedFunctions) {
                const exportedName = exp.Name.replace(/"/g, '');

                for (const functionName of crawledfunctionNames) {
                    if (exportedName == functionName) {
                        functionOfInterest = exp.ExportSource;
                        break;
                    }
                }
            }

        }

        if (functionOfInterest == null) {
            for(const exportFunc of exportedFunctions){
                const fullProgramGraph = new FullProgramGraph(this);
                try{
                    const graph = fullProgramGraph.makeFullGraph(exportFunc);

                    const adjacencyList = graph.IndexAdjacentList;
                    const nodes = Array.from(adjacencyList.keys());
                    
                    const edges = []
                    for (const [edge, neighbors] of adjacencyList.entries()) {
    
                        for (const neighbor of neighbors) {
                            if (neighbor == -1) {
                                continue;
                            }
                            edges.push([edge, neighbor]);
                        }
                    }
    
                    edgeListObject = {nodes, edges}
    
                    if(nodes.length > 5){
                        return edgeListObject;
                    }
                } catch(e){
                    console.error(e);

                    continue;
                }
                
                
            }

            for(const func of actualProgramFunctions){
                try{
                    const fullProgramGraph = new FullProgramGraph(this);

                    const graph = fullProgramGraph.makeFullGraph(func);
    
                    const adjacencyList = graph.IndexAdjacentList;
                    const nodes = Array.from(adjacencyList.keys());
                    
                    const edges = []
                    for (const [edge, neighbors] of adjacencyList.entries()) {
    
                        for (const neighbor of neighbors) {
                            if (neighbor == -1) {
                                continue;
                            }
                            edges.push([edge, neighbor]);
                        }
                    }
    
                    edgeListObject = {nodes, edges}
                    
                    if(nodes.length > 5){
                        return edgeListObject;
                    }
                } catch(e){
                    console.error(e);
                    continue;
                }
                
                
            }
            
        } else {
            const fullProgramGraph = new FullProgramGraph(this);

            const graph = fullProgramGraph.makeFullGraph(functionOfInterest);

            const adjacencyList = graph.IndexAdjacentList;
            const nodes = Array.from(adjacencyList.keys());
            
            const edges = []
            for (const [edge, neighbors] of adjacencyList.entries()) {

                for (const neighbor of neighbors) {
                    if (neighbor == -1) {
                        continue;
                    }
                    edges.push([edge, neighbor]);
                }
            }

            edgeListObject = {nodes, edges}
                
        }


        return edgeListObject;
    }

    async getFileHash() {
        let filepath = this.File;
        const filehash = await makeFileHash(filepath);
        this.FileHash = filehash;
        return filehash;
    }

    async convertWasmIntoWat() {
        let finalWatOutput = null;
        const fullPath = this.File;
        const directory = path.dirname(fullPath);
        const wasmFilename = path.basename(fullPath);
        try {
            const standardWatName = `standard_${wasmFilename.replace('.wasm', '')}.wat`;
            const watOutputPath = path.resolve(WAT_OUTPUT_PATH, standardWatName);
            await exec(`${WABT_WASM2WAT_PATH} -o ${watOutputPath} ${fullPath}`);

            finalWatOutput = watOutputPath;
            this.WebAssemblyType = 'standard';
        } catch (err) {
            // console.log(err);
            // Possible ASM.js module, use converter first
            const asmConverterImplementations = [ASM_BINARY_CONVERTER_PATH, ASM_BINARY_CONVERTER_ALT_PATH];
            let converterAttempt = 0;
            for(const asmConverterPath of asmConverterImplementations){
                try {
                    const outputWasmName = `asm_${wasmFilename}`;
                    const asmWasmOutputPath = path.resolve(ASM_WASM_OUTPUT_PATH, outputWasmName);
    
                    await exec(`${asmConverterPath} "${fullPath}" "${asmWasmOutputPath}"`);
    
                    const asmWatName = `asm_${wasmFilename.replace('.wasm', '')}.wat`;
                    const watOutputPath = path.resolve(WAT_OUTPUT_PATH, asmWatName);
    
                    await exec(`${WABT_WASM2WAT_PATH} -o "${watOutputPath}" "${asmWasmOutputPath}"`);
                    finalWatOutput = watOutputPath;
                    this.WebAssemblyType = 'asm';
                } catch (e) {
                    console.error(e);

                    if(converterAttempt == asmConverterImplementations.length){
                        throw e;
                    }
                }
            }
            

        } finally {
            return finalWatOutput;
        }
    }

    readWatForDetails(watFilename) {
        return this.readWatFile(watFilename, this.onLineReadForDetails.bind(this));
    }

    readWatForAbstractions(watFilename) {
        return this.readWatFile(watFilename, this.onLineReadForAbstraction.bind(this));
    }

    readWatFile(watFilename, callback) {
        this.lineNumber = 0;
        this.currentFunction = null;
        return new Promise((resolve, reject) => {
            const fileStats = fs.statSync(watFilename);
            this.WatFileSize = fileStats.size;

            const readInterface = readline.createInterface({
                input: fs.createReadStream(watFilename),
            });

            readInterface.on('line', (line) => {
                this.lineNumber += 1;
                callback(line);

            });
            readInterface.on('error', (error) => {
                console.error(error);
                reject(error)
            });

            readInterface.on('close', () => {
                resolve()

            });

        })
    }

    isWasm() {
        const filename = this.Filename;

        return true;
        // if (filename.includes('.wasm')) {
        //     return true;
        // }

        // return false;
    }

    getFeatures() {
        const fileHash = this.FileHash;

        const cleanImportName = (name) => name.replace(/"/g, '').replace(' ', '.');
        const importFunctions = this.Imports.map(imp => cleanImportName(imp.Name)).join(',')
        const exportFunctions = this.Exports.map(exp => cleanImportName(exp.Name)).join(',')
        const cleanFunctionName = functionName => functionName.replace('$', '')
        const functions = Object.keys(this.Functions).map(cleanFunctionName)
        // .filter(functionName => !importFunctions.includes(functionName))
        const wasmFileSize = this.WasmFileSize / 1024; //KB
        const watFileSize = this.WatFileSize / 1024;
        const expansionFactor = watFileSize / wasmFileSize;
        const isAsm = this.WebAssemblyType == 'asm';
        const totalLinesOfCode = this.lineNumber;
        let minFunctionLinesOfCode = Number.MAX_SAFE_INTEGER;
        let maxFuntionLinesOfCode = Number.MIN_SAFE_INTEGER;
        let avgFuntionLinesOfCode = 0;
        const numberOfImports = this.Imports.length;
        const numberOfExports = this.Exports.length;
        const numberOfDataSections = this.DataSections.length;
        const numberOfTableEntries = this.TableFunctions.length;

        const originalFunctionNames = Object.keys(this.Functions);
        for (let functionName of originalFunctionNames) {
            let currentFunctionDetails = this.Functions[functionName];
            let numLinesOfCode = currentFunctionDetails.EndingLineNumber = currentFunctionDetails.StartingLineNumber;
            if (numLinesOfCode < minFunctionLinesOfCode) minFunctionLinesOfCode = numLinesOfCode;
            if (numLinesOfCode > maxFuntionLinesOfCode) maxFuntionLinesOfCode = numLinesOfCode;
            avgFuntionLinesOfCode += numLinesOfCode;
        }
        if (originalFunctionNames.length == 0) {
            avgFuntionLinesOfCode = 0;
            minFunctionLinesOfCode = 0;
            maxFuntionLinesOfCode = 0;
        } else {
            avgFuntionLinesOfCode = avgFuntionLinesOfCode / originalFunctionNames.length;

        }

        const numberOfTypes = Object.keys(this.Types).length;

        const FeatureDetails = {
            FileHash: fileHash,
            ImportFunctions: importFunctions,
            ExportFunctions: exportFunctions,
            NumberOfFunctions: functions.length,
            WasmFileSize: wasmFileSize,
            WatFileSize: watFileSize,
            ExpansionFactor: expansionFactor,
            IsAsm: isAsm,
            TotalLinesOfCode: totalLinesOfCode,
            MinFunctionLinesOfCode: minFunctionLinesOfCode,
            MaxFunctionLinesOfCode: maxFuntionLinesOfCode,
            AvgFunctionLinesOfCode: avgFuntionLinesOfCode,
            NumberOfTypes: numberOfTypes,
            NumberOfImports: numberOfImports,
            NumberOfExports: numberOfExports,
            NumberOfDataSections: numberOfDataSections,
            NumberOfTableEntries: numberOfTableEntries
        }

        return FeatureDetails;
    }

    async insertGraphIntoDB(graphObject) {
        const insertQuery = `UPDATE wat_details 
                            SET CFGEdgeList = ?
                            WHERE FileHash = ?;`

        const features = this.getFeatures();
        const objectToInsert = JSON.stringify(graphObject);

        const parameters = [
            objectToInsert,
            features.FileHash
        ]
        try {
            await this.database.query(insertQuery, parameters);
        } catch (err) {
            console.error(err)
        }

    }

    async getGraphFromDB() {
        let graph = null;
        const selectQuery = `SELECT CFGEdgeList FROM wat_details WHERE FileHash = ? `

        const parameters = [
            this.FileHash
        ];

        try {
            let result = await this.database.query(selectQuery, parameters);
            if (result != null && result.length > 0) {
                graph = JSON.parse(result[0].CFGEdgeList);
            }
        } catch (err) {
            console.error(err)
        } finally {
            return graph
        }
    }

    async insertResultsIntoDB() {
        const insertQuery = `INSERT INTO wat_details (
            FileHash,
            ImportFunctions,
            ExportFunctions,
            NumberOfFunctions,
            WasmFileSize,
            WatFileSize,
            ExpansionFactor,
            IsAsm,
            TotalLinesOfCode,
            MinFunctionLinesOfCode,
            MaxFunctionLinesOfCode,
            AvgFunctionLinesOfCode,
            NumberOfTypes,
            OriginalFileName,
            NumberOfImports,
            NumberOfExports,
            NumberOfDataSections,
            NumberOfTableEntries
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        );`

        const features = this.getFeatures();

        const parameters = [
            features.FileHash,
            features.ImportFunctions,
            features.ExportFunctions,
            features.NumberOfFunctions,
            features.WasmFileSize,
            features.WatFileSize,
            features.ExpansionFactor,
            features.IsAsm,
            features.TotalLinesOfCode,
            features.MinFunctionLinesOfCode,
            features.MaxFunctionLinesOfCode,
            features.AvgFunctionLinesOfCode,
            features.NumberOfTypes,
            this.OriginalUploadFilename,
            features.NumberOfImports,
            features.NumberOfExports,
            features.NumberOfDataSections,
            features.NumberOfTableEntries

        ]
        try {
            await this.database.query(insertQuery, parameters);
        } catch (err) {
            if(err.code != 'ER_DUP_ENTRY'){
                console.error(err)
            }
        } finally {
            return features;
        }
    }


    async getResultsFromDB() {
        const selectQuery = `
            SELECT  
                FileHash,
                ImportFunctions,
                ExportFunctions,
                NumberOfFunctions,
                WasmFileSize,
                WatFileSize,
                ExpansionFactor,
                IsAsm,
                TotalLinesOfCode,
                MinFunctionLinesOfCode,
                MaxFunctionLinesOfCode,
                AvgFunctionLinesOfCode,
                NumberOfTypes,
                NumberOfImports,
                NumberOfExports,
                NumberOfDataSections,
                NumberOfTableEntries
            FROM webassembly_classifier.wat_details
            WHERE FileHash = ?;
        ;`

        const fileHash = this.FileHash;

        let result = null;
        try {
            result = await this.database.query(selectQuery, [fileHash]);
        } catch (err) {
            console.error(err);
        } finally {
            return result;
        }
    }

    cleanToken(token) {
        return token.replace(/[\(\)\;]/g, '');
    }

    static async getModuleByExtremeStatistic(purpose,statisticFeature, metric, db){
        const purposeLabels = ['Auxiliary Utility','Other Applications', 'Compression Utility', 'Cryptographic Utility', 'Cryptominer', 'Game', 'Grammar Utility', 'Image Processing Utility', 'JavaScript Carrier', 'Numeric Utility', 'WebAssembly Support Tester']
        const statisticFeatures = {
            'wasm_size': 'WasmFileSize',
            'wat_size': 'WatFileSize',
            'number_functions': 'NumberOfFunctions',
        }
        console.log(statisticFeature,purpose,metric)

        
        const metrics = {
            'min': 'MIN',
            'max': 'MAX'
        }


        const metricToUse = metrics[metric];
        if(!metricToUse){
            return null;
        }

        if( !purposeLabels.includes(purpose) ){
            return null;
        }
        const statisticFeatureToUse = statisticFeatures[statisticFeature];

        if(!statisticFeatureToUse){
            return null
        }


        const selectQuery = `SELECT  
                FileHash,
                OriginalFilename AS OriginalUploadFilename,
                ImportFunctions,
                ExportFunctions,
                NumberOfFunctions,
                WasmFileSize,
                WatFileSize,
                ExpansionFactor,
                IsAsm,
                TotalLinesOfCode,
                MinFunctionLinesOfCode,
                MaxFunctionLinesOfCode,
                AvgFunctionLinesOfCode,
                NumberOfTypes,
                NumberOfImports,
                NumberOfExports,
                NumberOfDataSections,
                NumberOfTableEntries,
                Purpose AS label
            FROM wat_details
            WHERE Purpose = ? AND
            ${statisticFeatureToUse} = (
                SELECT ${metricToUse}(${statisticFeatureToUse}) FROM wat_details
                
                WHERE Purpose = ? AND
                FileHash IN (
                    SELECT FileHash FROM wasm_associations WHERE SourceType='Website'
                )
            )`

        const selectSourceQuery = `
        (
            SELECT DISTINCT SourceName AS Page
            FROM wasm_associations
            WHERE SourceType = 'Website' 
                AND FileHash= ?
                
        )
        UNION 
        (
            SELECT DISTINCT PageFound AS Page
            FROM found_page
            WHERE FileHash = ?
        )
        `

        let result = null;
        let sitesUsed = [];
        try {
            result = await db.query(selectQuery, [purpose, purpose]);
            result = result[0];
            sitesUsed =  await db.query(selectSourceQuery, [result.FileHash, result.FileHash]);

        } catch (err) {
            console.error(err);
        } finally {
            return {
                features: result,
                sitesUsed: sitesUsed
            };
        }
    }

    async main() {
        let filehash = await this.getFileHash()

        let startingFunction = null;
        let programDetailResults = null;
        let storedResults = await this.getResultsFromDB();
        let edgeListObject = null;
        if (storedResults == null || storedResults.length == 0) {

            try {
                if (this.isWasm()) {
                    startingFunction = this.convertWasmIntoWat.bind(this);
                } else {
                    startingFunction = () => Promise.resolve(this.File);
                }
                let watFilename = await startingFunction();
                await this.readWatForDetails(watFilename);
                
                programDetailResults = await this.insertResultsIntoDB()

                //NOTE: CFG decreases classifier accuracy

                // const storedGraph = await this.getGraphFromDB();
                // if (storedGraph == null) {
                //     try {

                //         await this.readWatForAbstractions(watFilename);

                //         edgeListObject = this.onLineReadForDetailsEnd();
                //         if(edgeListObject != null){
                //             await this.insertGraphIntoDB(edgeListObject);
                //         }
                //     } catch (e) {

                //         console.error('Abstraction/Graph Error: ', e)
                //     }
                // } else {
                //     edgeListObject = storedGraph;
                // }
            } catch (error) {
                throw error;
            }
        } else {
            programDetailResults = storedResults[0];
        }
        programDetailResults.OriginalUploadFilename = this.OriginalUploadFilename;
        programDetailResults.CFGEdgeList = edgeListObject
        return programDetailResults;
    }
};



module.exports = ProgramDetailsModel;