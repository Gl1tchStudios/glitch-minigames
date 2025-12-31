// -- Glitch Minigames
// -- Copyright (C) 2024 Glitch
// -- 
// -- This program is free software: you can redistribute it and/or modify
// -- it under the terms of the GNU General Public License as published by
// -- the Free Software Foundation, either version 3 of the License, or
// -- (at your option) any later version.
// -- 
// -- This program is distributed in the hope that it will be useful,
// -- but WITHOUT ANY WARRANTY; without even the implied warranty of
// -- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// -- GNU General Public License for more details.
// -- 
// -- You should have received a copy of the GNU General Public License
// -- along with this program. If not, see <https://www.gnu.org/licenses/>.

// Untangle Minigame - Drag dots to untangle crossed lines
var Untangle = (function() {
    var active = false;
    var nodes = [];
    var edges = [];
    var nodeCount = 8;
    var timeLimit = 60000;
    var timeRemaining = 0;
    var timerInterval = null;
    var canvas = null;
    var ctx = null;
    var draggingNode = null;
    var offsetX = 0;
    var offsetY = 0;
    var intersectionCount = 0;

    var NODE_RADIUS = 12;
    var NODE_COLOR = '#00d4ff';
    var NODE_GLOW = 'rgba(0, 212, 255, 0.6)';
    var LINE_COLOR = '#00d4ff';
    var LINE_INTERSECT_COLOR = '#ff4444';
    var LINE_WIDTH = 2;

    function generateNodes() {
        nodes = [];
        var padding = 60;
        var canvasWidth = canvas.width;
        var canvasHeight = canvas.height;
        
        for (var i = 0; i < nodeCount; i++) {
            var attempts = 0;
            var x, y, valid;
            
            do {
                x = padding + Math.random() * (canvasWidth - padding * 2);
                y = padding + Math.random() * (canvasHeight - padding * 2);
                valid = true;
                
                for (var j = 0; j < nodes.length; j++) {
                    var dx = x - nodes[j].x;
                    var dy = y - nodes[j].y;
                    if (Math.sqrt(dx * dx + dy * dy) < 50) {
                        valid = false;
                        break;
                    }
                }
                attempts++;
            } while (!valid && attempts < 100);
            
            nodes.push({ x: x, y: y, id: i });
        }
    }

    function generateEdges() {
        edges = [];
        

        var connected = [0];
        var unconnected = [];
        for (var i = 1; i < nodeCount; i++) {
            unconnected.push(i);
        }
        
        while (unconnected.length > 0) {
            var fromIdx = connected[Math.floor(Math.random() * connected.length)];
            var toIdx = unconnected.splice(Math.floor(Math.random() * unconnected.length), 1)[0];
            edges.push({ from: fromIdx, to: toIdx });
            connected.push(toIdx);
        }
        
        var extraEdges = Math.floor(nodeCount * 0.8);
        var attempts = 0;
        
        while (edges.length < nodeCount + extraEdges && attempts < 100) {
            var from = Math.floor(Math.random() * nodeCount);
            var to = Math.floor(Math.random() * nodeCount);
            
            if (from !== to && !edgeExists(from, to)) {
                edges.push({ from: from, to: to });
            }
            attempts++;
        }
    }

    function edgeExists(from, to) {
        for (var i = 0; i < edges.length; i++) {
            if ((edges[i].from === from && edges[i].to === to) ||
                (edges[i].from === to && edges[i].to === from)) {
                return true;
            }
        }
        return false;
    }

    function linesIntersect(p1, p2, p3, p4) {
        var d1 = direction(p3, p4, p1);
        var d2 = direction(p3, p4, p2);
        var d3 = direction(p1, p2, p3);
        var d4 = direction(p1, p2, p4);
        
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
            return true;
        }
        
        return false;
    }

    function direction(p1, p2, p3) {
        return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
    }

    function countIntersections() {
        var count = 0;
        
        for (var i = 0; i < edges.length; i++) {
            for (var j = i + 1; j < edges.length; j++) {
                var e1 = edges[i];
                var e2 = edges[j];
                
                if (e1.from === e2.from || e1.from === e2.to ||
                    e1.to === e2.from || e1.to === e2.to) {
                    continue;
                }
                
                var p1 = nodes[e1.from];
                var p2 = nodes[e1.to];
                var p3 = nodes[e2.from];
                var p4 = nodes[e2.to];
                
                if (linesIntersect(p1, p2, p3, p4)) {
                    count++;
                }
            }
        }
        
        return count;
    }

    function getIntersectingEdges() {
        var intersecting = new Set();
        
        for (var i = 0; i < edges.length; i++) {
            for (var j = i + 1; j < edges.length; j++) {
                var e1 = edges[i];
                var e2 = edges[j];
                
                if (e1.from === e2.from || e1.from === e2.to ||
                    e1.to === e2.from || e1.to === e2.to) {
                    continue;
                }
                
                var p1 = nodes[e1.from];
                var p2 = nodes[e1.to];
                var p3 = nodes[e2.from];
                var p4 = nodes[e2.to];
                
                if (linesIntersect(p1, p2, p3, p4)) {
                    intersecting.add(i);
                    intersecting.add(j);
                }
            }
        }
        
        return intersecting;
    }

    function render() {
        if (!ctx || !canvas) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        var intersectingEdges = getIntersectingEdges();
        
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            var from = nodes[edge.from];
            var to = nodes[edge.to];
            var isIntersecting = intersectingEdges.has(i);
            
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = isIntersecting ? LINE_INTERSECT_COLOR : LINE_COLOR;
            ctx.lineWidth = LINE_WIDTH;
            
            if (isIntersecting) {
                ctx.shadowColor = 'rgba(255, 68, 68, 0.6)';
                ctx.shadowBlur = 8;
            } else {
                ctx.shadowColor = NODE_GLOW;
                ctx.shadowBlur = 5;
            }
            
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
        
        for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = NODE_COLOR;
            ctx.shadowColor = NODE_GLOW;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.beginPath();
            ctx.arc(node.x - 3, node.y - 3, NODE_RADIUS * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
        }
        
        intersectionCount = intersectingEdges.size > 0 ? countIntersections() : 0;
        $('#untangle-crossings').text(intersectionCount);
        
        if (intersectionCount === 0 && active) {
            endGame(true);
        }
    }

    function getNodeAtPosition(x, y) {
        for (var i = nodes.length - 1; i >= 0; i--) {
            var node = nodes[i];
            var dx = x - node.x;
            var dy = y - node.y;
            if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS + 5) {
                return node;
            }
        }
        return null;
    }

    function handleMouseDown(e) {
        if (!active) return;
        
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        draggingNode = getNodeAtPosition(x, y);
        
        if (draggingNode) {
            offsetX = x - draggingNode.x;
            offsetY = y - draggingNode.y;
            canvas.style.cursor = 'grabbing';
        }
    }

    function handleMouseMove(e) {
        if (!active) return;
        
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        
        if (draggingNode) {
            var newX = Math.max(NODE_RADIUS, Math.min(canvas.width - NODE_RADIUS, x - offsetX));
            var newY = Math.max(NODE_RADIUS, Math.min(canvas.height - NODE_RADIUS, y - offsetY));
            
            draggingNode.x = newX;
            draggingNode.y = newY;
            render();
        } else {
            var hoverNode = getNodeAtPosition(x, y);
            canvas.style.cursor = hoverNode ? 'grab' : 'default';
        }
    }

    function handleMouseUp(e) {
        if (draggingNode) {
            draggingNode = null;
            canvas.style.cursor = 'default';
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            var touch = e.touches[0];
            handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    function handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            var touch = e.touches[0];
            handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    function handleTouchEnd(e) {
        handleMouseUp(e);
    }

    function updateTimer() {
        var pct = (timeRemaining / timeLimit) * 100;
        var sec = (timeRemaining / 1000).toFixed(1);
        
        $('.untangle-timer-progress').css('width', pct + '%');
        $('#untangle-timer').text(sec);
        
        if (pct < 25) {
            $('.untangle-timer-progress').addClass('danger');
        } else {
            $('.untangle-timer-progress').removeClass('danger');
        }
    }

    function startGame(config) {
        console.log('[Untangle] Starting', config);
        
        nodeCount = (config && config.nodeCount) ? config.nodeCount : 8;
        timeLimit = (config && config.timeLimit) ? config.timeLimit : 60000;
        
        active = true;
        timeRemaining = timeLimit;
        draggingNode = null;
        
        canvas = document.getElementById('untangle-canvas');
        ctx = canvas.getContext('2d');
        
        canvas.width = 400;
        canvas.height = 350;
        
        generateNodes();
        generateEdges();
        
        var attempts = 0;
        while (countIntersections() < 2 && attempts < 10) {
            generateNodes();
            attempts++;
        }
        
        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mouseleave', handleMouseUp);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);
        
        render();
        updateTimer();
        
        $('#untangle-container').addClass('active').css('display', 'flex');
        
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            timeRemaining -= 100;
            updateTimer();
            if (timeRemaining <= 0) {
                endGame(false);
            }
        }, 100);
    }

    function endGame(success) {
        if (!active) return;
        console.log('[Untangle] End:', success);
        
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (canvas) {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        }
        
        if (typeof playSoundSafe === 'function') {
            playSoundSafe(success ? 'sound-success' : 'sound-failure');
        }
        
        var cls = success ? 'success' : 'failure';
        var txt = success ? 'UNTANGLED!' : 'TIME UP!';
        var $result = $('<div class="untangle-result ' + cls + '">' + txt + '</div>');
        $('.untangle-display').append($result);
        
        setTimeout(function() {
            $('#untangle-container').removeClass('active').fadeOut(300, function() {
                $('.untangle-result').remove();
            });
            $.post('https://' + GetParentResourceName() + '/untangleResult', JSON.stringify({
                success: success,
                crossings: intersectionCount
            }));
        }, 1500);
    }

    function closeGame() {
        console.log('[Untangle] Close');
        active = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        if (canvas) {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
        }
        
        $('#untangle-container').removeClass('active').hide();
        $('.untangle-result').remove();
        
        $.post('https://' + GetParentResourceName() + '/untangleClose', JSON.stringify({}));
    }

    return {
        start: startGame,
        stop: endGame,
        close: closeGame
    };
})();

window.untangleFunctions = Untangle;
window.closeUntangleGame = Untangle.close;

console.log('[Untangle] Loaded');
